import assert from 'node:assert/strict';

// The integration suite always targets the repository-scoped services, never a developer's default ports.
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@127.0.0.1:55432/1hrlearning';
process.env.REDIS_URL ??= 'redis://:redis@127.0.0.1:56379';
process.env.JWT_SECRET ??= 'integration-jwt-secret-that-is-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ??= 'integration-refresh-secret-that-is-at-least-32-characters';

// Load application modules only after the isolated-service contract is in place because config is parsed at import time.
const { prisma } = require('../utils/prisma') as typeof import('../utils/prisma');
const { pointsService } = require('../services/points.service') as typeof import('../services/points.service');
const { sessionsService } = require('../services/sessions.service') as typeof import('../services/sessions.service');

async function main(): Promise<void> {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const passwordHash = 'integration-test-only';
  const users = await Promise.all(['teacher', 'learner-a', 'learner-b'].map((name) => prisma.user.create({
    data: {
      email: `${name}-${suffix}@example.test`, username: `${name}-${suffix}`, displayName: name,
      passwordHash, isVerified: true, pointsBalance: name === 'teacher' ? 0 : 20,
    },
  })));
  const [teacher, learnerA, learnerB] = users;
  const skill = await prisma.skill.create({ data: { name: `Integration ${suffix}`, slug: `integration-${suffix}`, category: 'Test' } });

  try {
    const availability = await prisma.availability.create({
      data: { userId: teacher.id, startTime: new Date(Date.now() + 86_400_000), endTime: new Date(Date.now() + 90_000_000) },
    });
    const rollbackSession = await prisma.session.create({
      data: { teacherId: teacher.id, learnerId: learnerA.id, skillId: skill.id, scheduledAt: availability.startTime, availabilityId: availability.id },
    });
    await assert.rejects(prisma.$transaction(async (tx) => {
      await pointsService.lockPoints(learnerA.id, rollbackSession.id, 60, tx);
      await tx.availability.update({ where: { id: availability.id }, data: { status: 'BOOKED' } });
      // This intentional failure proves every preceding balance/session/availability write rolls back together.
      throw new Error('forced rollback');
    }));
    const [rolledBackUser, rolledBackSession, rolledBackAvailability] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: learnerA.id } }),
      prisma.session.findUniqueOrThrow({ where: { id: rollbackSession.id } }),
      prisma.availability.findUniqueOrThrow({ where: { id: availability.id } }),
    ]);
    assert.equal(rolledBackUser.pointsBalance, 20);
    assert.equal(rolledBackUser.pointsLocked, 0);
    assert.equal(rolledBackSession.pointsLocked, false);
    assert.equal(rolledBackAvailability.status, 'OPEN');

    const publicSession = await prisma.session.create({
      data: { teacherId: teacher.id, skillId: skill.id, scheduledAt: new Date(Date.now() + 172_800_000), isPublic: true },
    });
    const [appA, appB] = await Promise.all([
      prisma.sessionApplication.create({ data: { sessionId: publicSession.id, applicantId: learnerA.id } }),
      prisma.sessionApplication.create({ data: { sessionId: publicSession.id, applicantId: learnerB.id } }),
    ]);
    const attempts = await Promise.allSettled([
      sessionsService.updateSessionApplication(publicSession.id, appA.id, teacher.id, { status: 'ACCEPTED' }),
      sessionsService.updateSessionApplication(publicSession.id, appB.id, teacher.id, { status: 'ACCEPTED' }),
    ]);
    assert.equal(attempts.filter((attempt) => attempt.status === 'fulfilled').length, 1);
    const filled = await prisma.session.findUniqueOrThrow({ where: { id: publicSession.id } });
    const applications = await prisma.sessionApplication.findMany({ where: { sessionId: publicSession.id } });
    assert.equal(applications.filter((application) => application.status === 'ACCEPTED').length, 1);
    assert.equal(applications.filter((application) => application.status === 'REJECTED').length, 1);
    assert.equal(filled.pointsLocked, true);
    assert.ok(filled.learnerId);
    const winner = await prisma.user.findUniqueOrThrow({ where: { id: filled.learnerId! } });
    assert.equal(winner.pointsBalance, 10);
    assert.equal(winner.pointsLocked, 10);

    await sessionsService.updateSession(publicSession.id, teacher.id, { status: 'COMPLETED' });
    await assert.rejects(sessionsService.updateSession(publicSession.id, teacher.id, { status: 'COMPLETED' }));
    const [settled, settledLearner, settledTeacher] = await Promise.all([
      prisma.session.findUniqueOrThrow({ where: { id: publicSession.id } }),
      prisma.user.findUniqueOrThrow({ where: { id: filled.learnerId! } }),
      prisma.user.findUniqueOrThrow({ where: { id: teacher.id } }),
    ]);
    assert.equal(settled.pointsTransferred, 10);
    assert.equal(settledLearner.pointsLocked, 0);
    assert.equal(settledTeacher.pointsBalance, 10);
    assert.equal(settledTeacher.totalSessionsTaught, 1);
    assert.equal(await prisma.pointTransaction.count({ where: { sessionId: publicSession.id } }), 2);
    console.log('✅ Session economy rollback, concurrency, and retry integration tests passed');
  } finally {
    // Test-owned records are removed in dependency order; no seeded or user-created data is touched.
    const sessionIds = (await prisma.session.findMany({ where: { skillId: skill.id }, select: { id: true } })).map(({ id }) => id);
    await prisma.pointTransaction.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await prisma.notification.deleteMany({ where: { userId: { in: users.map(({ id }) => id) } } });
    await prisma.session.deleteMany({ where: { id: { in: sessionIds } } });
    await prisma.availability.deleteMany({ where: { userId: teacher.id } });
    await prisma.skill.delete({ where: { id: skill.id } });
    await prisma.user.deleteMany({ where: { id: { in: users.map(({ id }) => id) } } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
