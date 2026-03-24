import { prisma } from '../utils/prisma';
import { AppError } from '../types';
import type { CreateSessionInput, UpdateSessionInput, RateSessionInput, ApplyToSessionInput, UpdateSessionApplicationInput } from '@1hrlearning/shared';
import { POINTS } from '@1hrlearning/shared';
import { notificationService } from './notification.service';
import { pointsService } from './points.service';
import { emailService } from './email.service';

export class SessionsService {
  async createSession(teacherId: string, input: CreateSessionInput) {
    const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
    if (!teacher) throw new AppError('Teacher not found', 404);

    const skill = await prisma.skill.findUnique({ where: { id: input.skillId } });
    if (!skill) throw new AppError('Skill not found', 404);

    const teacherHasSkill = await prisma.userSkill.findFirst({
      where: { userId: teacherId, skillId: input.skillId, isTeaching: true },
    });
    if (!teacherHasSkill) throw new AppError('Teacher does not teach this skill', 400);

    const resolvedMeetingUrl = input.meetingUrl ?? teacher.defaultMeetingUrl;
    if (!resolvedMeetingUrl) {
      throw new AppError('Configure a default meeting link in Settings or provide a meeting URL to create a session', 400);
    }

    // If a specific learner is provided (private session)
    if (input.learnerId) {
      if (teacherId === input.learnerId) throw new AppError('You cannot book a session with yourself', 400);

      const learner = await prisma.user.findUnique({ where: { id: input.learnerId } });
      if (!learner) throw new AppError('Learner not found', 404);

      if (learner.pointsBalance < POINTS.MIN_BALANCE_TO_BOOK) {
        throw new AppError('Learner has insufficient points', 400);
      }

      const session = await prisma.session.create({
        data: {
          teacherId,
          learnerId: input.learnerId,
          skillId: input.skillId,
          scheduledAt: new Date(input.scheduledAt),
          durationMinutes: input.durationMinutes ?? 60,
          notes: input.notes ?? null,
          sessionType: input.sessionType ?? 'TEACHING',
          isPublic: false,
          meetingUrl: resolvedMeetingUrl,
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

    // Public session (open for applications)
    if (!input.isPublic) throw new AppError('Either provide a learnerId or set isPublic to true', 400);

    const session = await prisma.session.create({
      data: {
        teacherId,
        learnerId: null,
        skillId: input.skillId,
        scheduledAt: new Date(input.scheduledAt),
        durationMinutes: input.durationMinutes ?? 60,
        notes: input.notes ?? null,
        sessionType: input.sessionType ?? 'TEACHING',
        isPublic: true,
        meetingUrl: resolvedMeetingUrl,
        applicationDeadline: input.applicationDeadline ? new Date(input.applicationDeadline) : null,
        maxLearners: input.maxLearners ?? 1,
        status: 'PENDING',
      },
      include: { skill: true, teacher: { select: { id: true, displayName: true } } },
    });

    const interestedLearners = await prisma.user.findMany({
      where: {
        id: { not: teacherId },
        isActive: true,
        isDiscoverable: true,
        adEmailOptOut: false,
        skills: {
          some: {
            skillId: input.skillId,
            isLearning: true,
          },
        },
      },
      select: { id: true },
    });

    await Promise.all(
      interestedLearners.map((learner) =>
        notificationService.create(learner.id, {
          type: 'SESSION_SKILL_MATCH',
          title: 'New Matching Teaching Session',
          message: `${teacher.displayName} created a ${skill.name} session matching your learning interests`,
          data: { sessionId: session.id, skillId: input.skillId },
        }),
      ),
    );

    return session;
  }

  async discoverPublicSessions(userId: string, page: number, limit: number, skillId?: string) {
    const skip = (page - 1) * limit;
    const where = {
      isPublic: true,
      status: 'PENDING' as const,
      teacherId: { not: userId },
      ...(skillId ? { skillId } : {}),
    };

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        include: {
          skill: true,
          teacher: { select: { id: true, username: true, displayName: true, avatarUrl: true, averageRating: true, ratingCount: true, totalSessionsTaught: true, isVerified: true } },
          applications: { where: { applicantId: userId }, select: { id: true, status: true } },
        },
        skip,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
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

  async applyToSession(sessionId: string, applicantId: string, input: ApplyToSessionInput) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { teacher: { select: { id: true, displayName: true } }, skill: true },
    });

    if (!session) throw new AppError('Session not found', 404);
    if (!session.isPublic) throw new AppError('This session is not open for applications', 400);
    if (session.teacherId === applicantId) throw new AppError('You cannot apply to your own session', 400);
    if (session.status !== 'PENDING') throw new AppError('Session is no longer accepting applications', 400);

    if (session.applicationDeadline && new Date() > session.applicationDeadline) {
      throw new AppError('Application deadline has passed', 400);
    }

    const existing = await prisma.sessionApplication.findUnique({
      where: { sessionId_applicantId: { sessionId, applicantId } },
    });
    if (existing) throw new AppError('You have already applied to this session', 409);

    const applicant = await prisma.user.findUnique({ where: { id: applicantId }, select: { displayName: true, pointsBalance: true } });
    if (!applicant) throw new AppError('Applicant not found', 404);
    if (applicant.pointsBalance < POINTS.MIN_BALANCE_TO_BOOK) throw new AppError('Insufficient points to apply', 400);

    const application = await prisma.sessionApplication.create({
      data: {
        sessionId,
        applicantId,
        message: input.message ?? null,
        status: 'PENDING',
      },
      include: { applicant: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });

    await notificationService.create(session.teacherId, {
      type: 'SESSION_APPLIED',
      title: 'New Session Application',
      message: `${applicant.displayName} applied to your ${session.skill.name} session`,
      data: { sessionId, applicationId: application.id },
    });

    return application;
  }

  async getSessionApplications(sessionId: string, teacherId: string) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError('Session not found', 404);
    if (session.teacherId !== teacherId) throw new AppError('Access denied', 403);

    return prisma.sessionApplication.findMany({
      where: { sessionId },
      include: {
        applicant: { select: { id: true, username: true, displayName: true, avatarUrl: true, averageRating: true, ratingCount: true, totalSessionsLearned: true, isVerified: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateSessionApplication(
    sessionId: string,
    applicationId: string,
    teacherId: string,
    input: UpdateSessionApplicationInput,
  ) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        skill: true,
        teacher: { select: { displayName: true, email: true } },
        learner: { select: { displayName: true, email: true } },
      },
    });
    if (!session) throw new AppError('Session not found', 404);
    if (session.teacherId !== teacherId) throw new AppError('Access denied', 403);

    const application = await prisma.sessionApplication.findUnique({ where: { id: applicationId } });
    if (!application || application.sessionId !== sessionId) throw new AppError('Application not found', 404);
    if (application.status !== 'PENDING') throw new AppError('Application has already been processed', 400);

    const updated = await prisma.sessionApplication.update({
      where: { id: applicationId },
      data: { status: input.status },
    });

    const teacher = await prisma.user.findUnique({ where: { id: teacherId }, select: { displayName: true } });

    if (input.status === 'ACCEPTED') {
      // Assign learner to session and confirm
      await prisma.session.update({
        where: { id: sessionId },
        data: { learnerId: application.applicantId, status: 'CONFIRMED', isPublic: false },
      });

      // Reject other pending applications
      await prisma.sessionApplication.updateMany({
        where: { sessionId, id: { not: applicationId }, status: 'PENDING' },
        data: { status: 'REJECTED' },
      });

      await notificationService.create(application.applicantId, {
        type: 'SESSION_APPLICATION_ACCEPTED',
        title: 'Application Accepted!',
        message: `${teacher?.displayName} accepted your application for the ${session.skill.name} session`,
        data: { sessionId, applicationId },
      });

      if (session.learner?.email) {
        await emailService.sendSessionConfirmation(session.learner.email, {
          partnerName: teacher?.displayName ?? session.teacher.displayName,
          skillName: session.skill.name,
          scheduledAt: session.scheduledAt,
          meetingUrl: session.meetingUrl ?? undefined,
        });
      }
    } else {
      await notificationService.create(application.applicantId, {
        type: 'SESSION_APPLICATION_REJECTED',
        title: 'Application Not Accepted',
        message: `Your application for the ${session.skill.name} session was not selected`,
        data: { sessionId, applicationId },
      });
    }

    return updated;
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
        applications: {
          include: {
            applicant: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!session) throw new AppError('Session not found', 404);

    // Public sessions are visible to everyone
    if (!session.isPublic && session.teacherId !== userId && session.learnerId !== userId) {
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
      if (session.learnerId) {
        await this._handleCompletion(session.id, session.teacherId, session.learnerId, session.skillId);
      }
    }
    if (input.status === 'CANCELLED') {
      updateData.cancelledAt = new Date();
    }

    if (input.status === 'CONFIRMED') {
      const [teacher, learner, skill] = await Promise.all([
        prisma.user.findUnique({ where: { id: session.teacherId }, select: { displayName: true } }),
        session.learnerId ? prisma.user.findUnique({ where: { id: session.learnerId }, select: { displayName: true } }) : null,
        prisma.skill.findUnique({ where: { id: session.skillId }, select: { name: true } }),
      ]);

      if (session.learnerId) {
        await Promise.all([
          notificationService.create(session.learnerId, {
            type: 'SESSION_CONFIRMED',
            title: 'Session Confirmed',
            message: `${teacher?.displayName} confirmed your ${skill?.name} session`,
            data: { sessionId },
          }),
          notificationService.create(session.teacherId, {
            type: 'SESSION_CONFIRMED',
            title: 'Session Confirmed',
            message: `You confirmed a ${skill?.name} session with ${learner?.displayName}`,
            data: { sessionId },
          }),
        ]);
      }
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
    if (!ratedUserId) throw new AppError('Cannot rate this session', 400);

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

  async generateCalendarIcs(sessionId: string, userId: string): Promise<string> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        skill: true,
        teacher: { select: { displayName: true, email: true } },
        learner: { select: { displayName: true, email: true } },
      },
    });

    if (!session) throw new AppError('Session not found', 404);
    if (session.teacherId !== userId && session.learnerId !== userId) {
      throw new AppError('Access denied', 403);
    }

    const start = session.scheduledAt;
    const end = new Date(start.getTime() + session.durationMinutes * 60 * 1000);

    const formatDate = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const organizerName = session.teacher.displayName;
    const attendeeName = session.learner?.displayName ?? 'Learner';
    const attendeeEmail = session.learner?.email ?? '';
    const summary = `${session.skill.name} Session with ${organizerName}`;
    const description = session.notes ? `Notes: ${session.notes}` : `1hrLearning session: ${session.skill.name}`;
    const location = session.meetingUrl ?? 'Online';

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//1hrLearning//1hrLearning//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:session-${session.id}@1hrlearning`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(start)}`,
      `DTEND:${formatDate(end)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      `ORGANIZER;CN=${organizerName}:mailto:${session.teacher.email}`,
      ...(attendeeEmail ? [`ATTENDEE;CN=${attendeeName}:mailto:${attendeeEmail}`] : []),
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    return ics;
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
