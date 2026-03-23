import { prisma } from '../utils/prisma';
import { AppError } from '../types';
import type { CreateSessionInput, UpdateSessionInput, RateSessionInput } from '@1hrlearning/shared';
import { POINTS } from '@1hrlearning/shared';
import { notificationService } from './notification.service';
import { pointsService } from './points.service';

export class SessionsService {
  async createSession(teacherId: string, input: CreateSessionInput) {
    if (teacherId === input.learnerId) {
      throw new AppError('You cannot book a session with yourself', 400);
    }

    const [teacher, learner, skill] = await Promise.all([
      prisma.user.findUnique({ where: { id: teacherId } }),
      prisma.user.findUnique({ where: { id: input.learnerId } }),
      prisma.skill.findUnique({ where: { id: input.skillId } }),
    ]);

    if (!teacher) throw new AppError('Teacher not found', 404);
    if (!learner) throw new AppError('Learner not found', 404);
    if (!skill) throw new AppError('Skill not found', 404);

    if (learner.pointsBalance < POINTS.MIN_BALANCE_TO_BOOK) {
      throw new AppError('Learner has insufficient points', 400);
    }

    const teacherHasSkill = await prisma.userSkill.findFirst({
      where: { userId: teacherId, skillId: input.skillId, isTeaching: true },
    });
    if (!teacherHasSkill) {
      throw new AppError('Teacher does not teach this skill', 400);
    }

    const session = await prisma.session.create({
      data: {
        teacherId,
        learnerId: input.learnerId,
        skillId: input.skillId,
        scheduledAt: new Date(input.scheduledAt),
        durationMinutes: input.durationMinutes ?? 60,
        notes: input.notes ?? null,
      },
      include: { skill: true, teacher: { select: { id: true, displayName: true } }, learner: { select: { id: true, displayName: true } } },
    });

    await notificationService.create(input.learnerId, {
      type: 'SESSION_REQUEST',
      title: 'New Session Request',
      message: `${teacher.displayName} wants to teach you ${skill.name}`,
      data: { sessionId: session.id },
    });

    return session;
  }

  async getSessions(userId: string, role: 'teacher' | 'learner' | 'all', page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = role === 'all'
      ? { OR: [{ teacherId: userId }, { learnerId: userId }] }
      : role === 'teacher'
      ? { teacherId: userId }
      : { learnerId: userId };

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        include: {
          skill: true,
          teacher: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          learner: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          ratings: true,
        },
        skip,
        take: limit,
        orderBy: { scheduledAt: 'desc' },
      }),
      prisma.session.count({ where }),
    ]);

    return {
      data: sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + sessions.length < total,
        hasPrev: page > 1,
      },
    };
  }

  async getSessionById(sessionId: string, userId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        skill: true,
        teacher: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        learner: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        ratings: true,
      },
    });

    if (!session) throw new AppError('Session not found', 404);
    if (session.teacherId !== userId && session.learnerId !== userId) {
      throw new AppError('Access denied', 403);
    }

    return session;
  }

  async updateSession(sessionId: string, userId: string, input: UpdateSessionInput) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError('Session not found', 404);

    if (session.teacherId !== userId && session.learnerId !== userId) {
      throw new AppError('Access denied', 403);
    }

    if (input.status === 'CONFIRMED' && session.teacherId !== userId) {
      throw new AppError('Only the teacher can confirm sessions', 403);
    }

    const updateData: Record<string, unknown> = { ...input };
    if (input.status === 'COMPLETED') {
      updateData.completedAt = new Date();
      await this._handleCompletion(session.id, session.teacherId, session.learnerId, session.skillId);
    }
    if (input.status === 'CANCELLED') {
      updateData.cancelledAt = new Date();
    }

    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: updateData,
      include: { skill: true },
    });

    return updated;
  }

  async rateSession(sessionId: string, raterId: string, input: RateSessionInput) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError('Session not found', 404);
    if (session.status !== 'COMPLETED') throw new AppError('Session is not completed yet', 400);
    if (session.teacherId !== raterId && session.learnerId !== raterId) {
      throw new AppError('Access denied', 403);
    }

    const existingRating = await prisma.rating.findUnique({
      where: { sessionId_raterId: { sessionId, raterId } },
    });
    if (existingRating) throw new AppError('You have already rated this session', 409);

    const ratedUserId = raterId === session.teacherId ? session.learnerId : session.teacherId;

    const rating = await prisma.rating.create({
      data: { sessionId, raterId, ratedUserId, score: input.score, comment: input.comment ?? null },
    });

    const ratings = await prisma.rating.findMany({
      where: { ratedUserId },
      select: { score: true },
    });
    const avg = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;

    await prisma.user.update({
      where: { id: ratedUserId },
      data: { averageRating: avg, ratingCount: ratings.length },
    });

    await notificationService.create(ratedUserId, {
      type: 'RATING_RECEIVED',
      title: 'New Rating',
      message: `You received a ${input.score}-star rating`,
      data: { sessionId, score: input.score },
    });

    return rating;
  }

  private async _handleCompletion(sessionId: string, teacherId: string, learnerId: string, skillId: string) {
    await Promise.all([
      pointsService.transfer(learnerId, teacherId, POINTS.PER_SESSION_TAUGHT, sessionId, 'Teaching session completion'),
      prisma.user.update({ where: { id: teacherId }, data: { totalSessionsTaught: { increment: 1 } } }),
      prisma.user.update({ where: { id: learnerId }, data: { totalSessionsLearned: { increment: 1 } } }),
      prisma.skill.update({ where: { id: skillId }, data: { sessionCount: { increment: 1 } } }),
    ]);

    await Promise.all([
      notificationService.create(teacherId, {
        type: 'SESSION_COMPLETED',
        title: 'Session Completed',
        message: `Your teaching session has been completed. You earned ${POINTS.PER_SESSION_TAUGHT} points!`,
        data: { sessionId },
      }),
      notificationService.create(learnerId, {
        type: 'SESSION_COMPLETED',
        title: 'Session Completed',
        message: 'Your learning session has been completed. Please rate your experience.',
        data: { sessionId },
      }),
    ]);
  }
}

export const sessionsService = new SessionsService();
