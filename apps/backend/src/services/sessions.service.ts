import { prisma } from '../utils/prisma';
import { AppError } from '../types';
import type {
  CreateSessionInput,
  UpdateSessionInput,
  RateSessionInput,
  ApplyToSessionInput,
  UpdateSessionApplicationInput,
  CreateTestimonialInput,
  SendInterestInput,
  SendSessionRequestInput,
} from '@1hrlearning/shared';
import { POINTS, POINT_CONFIG_KEYS } from '@1hrlearning/shared';
import { notificationService } from './notification.service';
import { pointsService, calcSessionPoints } from './points.service';
import { emailService } from './email.service';

async function getPointConfig(key: string, fallback: number): Promise<number> {
  const config = await prisma.pointConfig.findUnique({ where: { key } });
  return config ? config.value : fallback;
}

export class SessionsService {
  // ── Interest (first interaction) ────────────────────────────────────────────

  async sendInterest(learnerId: string, input: SendInterestInput) {
    const [sharer, skill, availability, learner] = await Promise.all([
      prisma.user.findUnique({ where: { id: input.sharerId } }),
      prisma.skill.findUnique({ where: { id: input.skillId } }),
      prisma.availability.findUnique({ where: { id: input.availabilityId } }),
      prisma.user.findUnique({ where: { id: learnerId }, select: { displayName: true, pointsBalance: true } }),
    ]);

    if (!sharer || sharer.isSuspended || sharer.isBanned) throw new AppError('Sharer not available', 404);
    if (!skill) throw new AppError('Skill not found', 404);
    if (!availability || availability.userId !== input.sharerId) throw new AppError('Availability slot not found', 404);
    if (availability.status !== 'OPEN') throw new AppError('This slot is no longer available', 400);
    if (!learner) throw new AppError('User not found', 404);
    if (learnerId === input.sharerId) throw new AppError('Cannot send interest to yourself', 400);

    const minBalance = await getPointConfig(POINT_CONFIG_KEYS.PER_30_MIN, POINTS.PER_30_MIN);
    if (learner.pointsBalance < minBalance) {
      throw new AppError(`You need at least ${minBalance} points to book a session`, 400);
    }

    const defaultDuration = sharer.defaultSessionDuration ?? 60;
    const session = await prisma.session.create({
      data: {
        teacherId: input.sharerId,
        learnerId,
        skillId: input.skillId,
        scheduledAt: availability.startTime,
        durationMinutes: defaultDuration,
        isPublic: false,
        status: 'PENDING',
        depthLevel: input.depthLevel,
        notes: input.message ?? null,
        availabilityId: input.availabilityId,
        pointsPerSession: calcSessionPoints(defaultDuration),
      },
      include: { skill: true, teacher: { select: { id: true, displayName: true } } },
    });

    // Hold the availability slot
    await prisma.availability.update({
      where: { id: input.availabilityId },
      data: { status: 'HELD' },
    });

    await notificationService.create(input.sharerId, {
      type: 'INTEREST_RECEIVED',
      title: 'New Interest',
      message: `${learner.displayName} is interested in learning ${skill.name} from you`,
      data: { sessionId: session.id, learnerId },
    });

    return session;
  }

  // ── Session Request (subsequent interaction) ─────────────────────────────────

  async sendSessionRequest(learnerId: string, input: SendSessionRequestInput) {
    const [sharer, skill, availability, learner] = await Promise.all([
      prisma.user.findUnique({ where: { id: input.sharerId } }),
      prisma.skill.findUnique({ where: { id: input.skillId } }),
      prisma.availability.findUnique({ where: { id: input.availabilityId } }),
      prisma.user.findUnique({ where: { id: learnerId }, select: { displayName: true, pointsBalance: true } }),
    ]);

    if (!sharer || sharer.isSuspended || sharer.isBanned) throw new AppError('Sharer not available', 404);
    if (!skill) throw new AppError('Skill not found', 404);
    if (!availability || availability.userId !== input.sharerId) throw new AppError('Availability slot not found', 404);
    if (availability.status !== 'OPEN') throw new AppError('This slot is no longer available', 400);
    if (!learner) throw new AppError('User not found', 404);
    if (learnerId === input.sharerId) throw new AppError('Cannot send a request to yourself', 400);

    const per30 = await getPointConfig(POINT_CONFIG_KEYS.PER_30_MIN, POINTS.PER_30_MIN);
    const pointsRequired = calcSessionPoints(input.durationMinutes, per30);

    if (learner.pointsBalance < pointsRequired) {
      throw new AppError(`You need ${pointsRequired} points for this session`, 400);
    }

    const session = await prisma.session.create({
      data: {
        teacherId: input.sharerId,
        learnerId,
        skillId: input.skillId,
        scheduledAt: availability.startTime,
        durationMinutes: input.durationMinutes,
        isPublic: false,
        status: 'PENDING',
        depthLevel: input.depthLevel,
        agenda: input.agenda,
        availabilityId: input.availabilityId,
        pointsPerSession: pointsRequired,
      },
      include: { skill: true, teacher: { select: { id: true, displayName: true } } },
    });

    await prisma.availability.update({
      where: { id: input.availabilityId },
      data: { status: 'HELD' },
    });

    await notificationService.create(input.sharerId, {
      type: 'SESSION_REQUEST',
      title: 'New Session Request',
      message: `${learner.displayName} sent a session request for ${skill.name}`,
      data: { sessionId: session.id, depthLevel: input.depthLevel, agenda: input.agenda },
    });

    return session;
  }

  // ── Create Session (teacher-initiated public or direct) ──────────────────────

  async createSession(teacherId: string, input: CreateSessionInput) {
    const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
    if (!teacher) throw new AppError('Teacher not found', 404);

    const skill = await prisma.skill.findUnique({ where: { id: input.skillId } });
    if (!skill) throw new AppError('Skill not found', 404);

    const teacherHasSkill = await prisma.userSkill.findFirst({
      where: { userId: teacherId, skillId: input.skillId, isTeaching: true },
    });
    if (!teacherHasSkill) throw new AppError('You do not teach this skill', 400);

    // Check weekly session limit
    const maxPerWeek = await getPointConfig(POINT_CONFIG_KEYS.MAX_SESSIONS_PER_WEEK, POINTS.MAX_SESSIONS_PER_WEEK);
    await this._checkWeeklyLimit(teacherId, maxPerWeek);

    // Resolve meeting URL
    let resolvedMeetingUrl = input.meetingUrl ?? null;
    if (!resolvedMeetingUrl && input.meetingLinkId) {
      const saved = await prisma.savedMeetingLink.findFirst({
        where: { id: input.meetingLinkId, userId: teacherId },
      });
      resolvedMeetingUrl = saved?.url ?? null;
    }
    if (!resolvedMeetingUrl) resolvedMeetingUrl = teacher.defaultMeetingUrl;
    if (!resolvedMeetingUrl) {
      throw new AppError('Configure a default meeting link in Settings or provide one when creating the session', 400);
    }

    const per30 = await getPointConfig(POINT_CONFIG_KEYS.PER_30_MIN, POINTS.PER_30_MIN);
    const pointsPerSession = calcSessionPoints(input.durationMinutes ?? 60, per30);

    if (input.isPublic) {
      const session = await prisma.session.create({
        data: {
          teacherId,
          skillId: input.skillId,
          scheduledAt: new Date(input.scheduledAt),
          durationMinutes: input.durationMinutes ?? 60,
          notes: input.notes ?? null,
          isPublic: true,
          meetingUrl: resolvedMeetingUrl,
          applicationDeadline: input.applicationDeadline ? new Date(input.applicationDeadline) : null,
          maxLearners: input.maxLearners ?? 1,
          status: 'PENDING',
          pointsPerSession,
        },
        include: { skill: true, teacher: { select: { id: true, displayName: true } } },
      });

      // Notify matched learners
      const interestedLearners = await prisma.user.findMany({
        where: {
          id: { not: teacherId },
          isActive: true,
          isDiscoverable: true,
          skills: { some: { skillId: input.skillId, isLearning: true } },
        },
        select: { id: true },
        take: 200,
      });

      await Promise.all(
        interestedLearners.map((learner) =>
          notificationService.create(learner.id, {
            type: 'PUBLIC_SESSION_AVAILABLE',
            title: 'New Session on Your Topic',
            message: `${teacher.displayName} created a ${skill.name} session — ${input.maxLearners ?? 1} seat(s) available`,
            data: { sessionId: session.id, skillId: input.skillId },
          }),
        ),
      );

      return session;
    }

    // Direct private session (teacher-initiated)
    if (!input.learnerId) throw new AppError('Provide a learnerId for a private session or set isPublic=true', 400);
    if (teacherId === input.learnerId) throw new AppError('Cannot book a session with yourself', 400);

    const learner = await prisma.user.findUnique({ where: { id: input.learnerId } });
    if (!learner) throw new AppError('Learner not found', 404);

    if (learner.pointsBalance < pointsPerSession) {
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
        isPublic: false,
        meetingUrl: resolvedMeetingUrl,
        depthLevel: input.depthLevel,
        agenda: input.agenda ?? null,
        pointsPerSession,
      },
      include: {
        skill: true,
        teacher: { select: { id: true, displayName: true } },
        learner: { select: { id: true, displayName: true, email: true } },
      },
    });

    await notificationService.create(input.learnerId, {
      type: 'SESSION_REQUEST',
      title: 'New Session Request',
      message: `${teacher.displayName} wants to teach you ${skill.name}`,
      data: { sessionId: session.id },
    });

    return session;
  }

  // ── Update Session ───────────────────────────────────────────────────────────

  async updateSession(sessionId: string, userId: string, input: UpdateSessionInput) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        skill: true,
        teacher: { select: { id: true, displayName: true, email: true } },
        learner: { select: { id: true, displayName: true, email: true } },
      },
    });
    if (!session) throw new AppError('Session not found', 404);

    const isTeacher = session.teacherId === userId;
    const isLearner = session.learnerId === userId;
    if (!isTeacher && !isLearner) throw new AppError('Access denied', 403);

    if (input.status === 'CONFIRMED' && !isTeacher) {
      throw new AppError('Only the sharer can confirm sessions', 403);
    }

    const updateData: Record<string, unknown> = {};

    if (input.status === 'CONFIRMED') {
      updateData.status = 'CONFIRMED';

      // Lock points for learner on confirmation
      if (session.learnerId) {
        await pointsService.lockPoints(session.learnerId, sessionId, session.durationMinutes);
      }

      // Mark availability slot as BOOKED
      if (session.availabilityId) {
        await prisma.availability.update({
          where: { id: session.availabilityId },
          data: { status: 'BOOKED' },
        });
      }

      // Notify both parties — meeting URL only revealed on confirm
      if (session.learnerId) {
        await Promise.all([
          notificationService.create(session.learnerId, {
            type: 'INTEREST_APPROVED',
            title: 'Session Confirmed!',
            message: `${session.teacher.displayName} confirmed your ${session.skill.name} session`,
            data: { sessionId, meetingUrl: session.meetingUrl },
          }),
          notificationService.create(session.teacherId, {
            type: 'SESSION_CONFIRMED',
            title: 'Session Confirmed',
            message: `Session with ${session.learner?.displayName} is confirmed`,
            data: { sessionId },
          }),
        ]);

        if (session.learner?.email) {
          await emailService.sendSessionConfirmation(session.learner.email, {
            partnerName: session.teacher.displayName,
            skillName: session.skill.name,
            scheduledAt: session.scheduledAt,
            meetingUrl: session.meetingUrl ?? undefined,
          });
        }
      }
    }

    if (input.status === 'CANCELLED') {
      updateData.status = 'CANCELLED';
      updateData.cancelledAt = new Date();
      updateData.cancelReason = input.cancelReason ?? null;

      // Release locked points and free availability slot
      if (session.learnerId && session.pointsLocked) {
        await pointsService.releaseLockedPoints(session.learnerId, sessionId);
      }
      if (session.availabilityId) {
        await prisma.availability.update({
          where: { id: session.availabilityId },
          data: { status: 'OPEN' },
        });
      }

      const otherUserId = isTeacher ? session.learnerId : session.teacherId;
      if (otherUserId) {
        await notificationService.create(otherUserId, {
          type: 'SESSION_CANCELLED',
          title: 'Session Cancelled',
          message: `Your ${session.skill.name} session has been cancelled`,
          data: { sessionId, reason: input.cancelReason },
        });
      }
    }

    if (input.status === 'NO_SHOW') {
      updateData.status = 'NO_SHOW';
      if (!isTeacher) throw new AppError('Only the sharer can mark a session as no-show', 403);
      // No-show by learner — points forfeited, sharer gets credit
      if (session.learnerId) {
        await pointsService.applyLearnerNoShow(session.learnerId, session.teacherId, sessionId);
      }
    }

    if (input.status === 'COMPLETED') {
      updateData.status = 'COMPLETED';
      updateData.completedAt = new Date();
      if (session.learnerId) {
        await this._handleCompletion(session.id, session.teacherId, session.learnerId, session.skillId, session.durationMinutes);
      }
    }

    if (input.scheduledAt) updateData.scheduledAt = new Date(input.scheduledAt);
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.cancelReason !== undefined) updateData.cancelReason = input.cancelReason;

    // Meeting URL update — only teacher can change it
    if (input.meetingUrl !== undefined) {
      if (!isTeacher) throw new AppError('Only the sharer can update the meeting URL', 403);
      updateData.meetingUrl = input.meetingUrl;
    }

    return prisma.session.update({
      where: { id: sessionId },
      data: updateData,
      include: { skill: true },
    });
  }

  // ── Decline Interest ─────────────────────────────────────────────────────────

  async declineSession(sessionId: string, teacherId: string, reason?: string) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError('Session not found', 404);
    if (session.teacherId !== teacherId) throw new AppError('Access denied', 403);
    if (session.status !== 'PENDING') throw new AppError('Session is not pending', 400);

    await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason ?? null },
    });

    // Release held availability slot
    if (session.availabilityId) {
      await prisma.availability.update({
        where: { id: session.availabilityId },
        data: { status: 'OPEN' },
      });
    }

    if (session.learnerId) {
      await notificationService.create(session.learnerId, {
        type: 'INTEREST_DECLINED',
        title: 'Interest Declined',
        message: reason
          ? `Your interest was declined: ${reason}`
          : 'Your interest was declined by the sharer',
        data: { sessionId, reason },
      });
    }
  }

  // ── Auto-complete ────────────────────────────────────────────────────────────

  async autoCompletePastSessions(): Promise<number> {
    const now = new Date();
    const pastSessions = await prisma.session.findMany({
      where: {
        status: 'CONFIRMED',
        scheduledAt: { lt: now },
      },
      select: { id: true, teacherId: true, learnerId: true, skillId: true, durationMinutes: true, scheduledAt: true },
    });

    let completed = 0;
    for (const session of pastSessions) {
      const endTime = new Date(session.scheduledAt.getTime() + session.durationMinutes * 60 * 1000);
      if (endTime < now && session.learnerId) {
        try {
          await prisma.session.update({
            where: { id: session.id },
            data: { status: 'COMPLETED', completedAt: now },
          });
          await this._handleCompletion(session.id, session.teacherId, session.learnerId, session.skillId, session.durationMinutes);
          completed++;
        } catch {
          // Continue processing other sessions
        }
      }
    }
    return completed;
  }

  // ── Rating ───────────────────────────────────────────────────────────────────

  async rateSession(sessionId: string, raterId: string, input: RateSessionInput) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError('Session not found', 404);
    if (!['COMPLETED', 'RATED'].includes(session.status)) {
      throw new AppError('Session is not completed yet', 400);
    }
    if (session.teacherId !== raterId && session.learnerId !== raterId) {
      throw new AppError('Access denied', 403);
    }

    const existing = await prisma.rating.findUnique({
      where: { sessionId_raterId: { sessionId, raterId } },
    });
    if (existing) throw new AppError('You have already rated this session', 409);

    const ratedUserId = raterId === session.teacherId ? session.learnerId : session.teacherId;
    if (!ratedUserId) throw new AppError('Cannot rate this session', 400);

    const rating = await prisma.rating.create({
      data: { sessionId, raterId, ratedUserId, score: input.score, comment: input.comment ?? null },
    });

    // Update average rating
    const ratings = await prisma.rating.findMany({ where: { ratedUserId }, select: { score: true } });
    const avg = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;
    await prisma.user.update({ where: { id: ratedUserId }, data: { averageRating: avg, ratingCount: ratings.length } });

    // Award rating bonus to sharer (only when learner rates sharer)
    const isLearnerRating = raterId === session.learnerId;
    if (isLearnerRating && session.teacherId === ratedUserId) {
      await pointsService.awardRatingBonus(session.teacherId, input.score, sessionId);
    }

    // Mark session RATED when both parties have rated
    const allRatings = await prisma.rating.count({ where: { sessionId } });
    const expectedRatings = session.learnerId ? 2 : 1;
    if (allRatings >= expectedRatings) {
      await prisma.session.update({ where: { id: sessionId }, data: { status: 'RATED' } });
    }

    await notificationService.create(ratedUserId, {
      type: 'RATING_RECEIVED',
      title: 'New Rating',
      message: `You received a ${input.score}-star rating`,
      data: { sessionId, score: input.score },
    });

    return rating;
  }

  // ── Testimonial ──────────────────────────────────────────────────────────────

  async createTestimonial(sessionId: string, authorId: string, input: CreateTestimonialInput) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError('Session not found', 404);
    if (!['COMPLETED', 'RATED'].includes(session.status)) {
      throw new AppError('Session is not completed yet', 400);
    }
    if (session.learnerId !== authorId) {
      throw new AppError('Only the learner can leave a testimonial', 403);
    }

    const existing = await prisma.testimonial.findUnique({
      where: { sessionId_authorId: { sessionId, authorId } },
    });
    if (existing) throw new AppError('You have already left a testimonial for this session', 409);

    const testimonial = await prisma.testimonial.create({
      data: {
        sessionId,
        authorId,
        recipientId: session.teacherId,
        content: input.content,
      },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    await notificationService.create(session.teacherId, {
      type: 'TESTIMONIAL_RECEIVED',
      title: 'New Testimonial',
      message: 'A learner left a testimonial on your profile',
      data: { sessionId, testimonialId: testimonial.id },
    });

    return testimonial;
  }

  async getTestimonialsForUser(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [testimonials, total] = await Promise.all([
      prisma.testimonial.findMany({
        where: { recipientId: userId, isApproved: true, isFlagged: false },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          session: { include: { skill: true } },
        },
      }),
      prisma.testimonial.count({ where: { recipientId: userId, isApproved: true, isFlagged: false } }),
    ]);

    return {
      data: testimonials,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + testimonials.length < total,
        hasPrev: page > 1,
      },
    };
  }

  // ── Public Session Applications ───────────────────────────────────────────────

  async applyToSession(sessionId: string, applicantId: string, input: ApplyToSessionInput) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { teacher: { select: { id: true, displayName: true } }, skill: true },
    });

    if (!session) throw new AppError('Session not found', 404);
    if (!session.isPublic) throw new AppError('This session is not open for applications', 400);
    if (session.teacherId === applicantId) throw new AppError('Cannot apply to your own session', 400);
    if (session.status !== 'PENDING') throw new AppError('Session is no longer accepting applications', 400);

    if (session.applicationDeadline && new Date() > session.applicationDeadline) {
      throw new AppError('Application deadline has passed', 400);
    }

    const existing = await prisma.sessionApplication.findUnique({
      where: { sessionId_applicantId: { sessionId, applicantId } },
    });
    if (existing) throw new AppError('You have already applied', 409);

    const applicant = await prisma.user.findUnique({
      where: { id: applicantId },
      select: { displayName: true, pointsBalance: true },
    });
    if (!applicant) throw new AppError('User not found', 404);

    const per30 = await getPointConfig(POINT_CONFIG_KEYS.PER_30_MIN, POINTS.PER_30_MIN);
    const required = calcSessionPoints(session.durationMinutes, per30);
    if (applicant.pointsBalance < required) {
      throw new AppError(`You need ${required} points for this session`, 400);
    }

    const application = await prisma.sessionApplication.create({
      data: {
        sessionId,
        applicantId,
        message: input.message ?? null,
        depthLevel: input.depthLevel ?? null,
        status: 'PENDING',
      },
      include: { applicant: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });

    await notificationService.create(session.teacherId, {
      type: 'SESSION_APPLIED',
      title: 'New Join Request',
      message: `${applicant.displayName} wants to join your ${session.skill.name} session`,
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
        applicant: {
          select: {
            id: true, username: true, displayName: true, avatarUrl: true,
            averageRating: true, ratingCount: true, totalSessionsLearned: true, isVerified: true,
          },
        },
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
      },
    });
    if (!session) throw new AppError('Session not found', 404);
    if (session.teacherId !== teacherId) throw new AppError('Access denied', 403);

    const application = await prisma.sessionApplication.findUnique({ where: { id: applicationId } });
    if (!application || application.sessionId !== sessionId) throw new AppError('Application not found', 404);
    if (application.status !== 'PENDING') throw new AppError('Application already processed', 400);

    const updated = await prisma.sessionApplication.update({
      where: { id: applicationId },
      data: { status: input.status },
    });

    const teacher = await prisma.user.findUnique({ where: { id: teacherId }, select: { displayName: true } });

    if (input.status === 'ACCEPTED') {
      await prisma.session.update({
        where: { id: sessionId },
        data: { learnerId: application.applicantId, status: 'CONFIRMED', isPublic: false },
      });

      // Lock learner points on acceptance
      await pointsService.lockPoints(application.applicantId, sessionId, session.durationMinutes);

      await prisma.sessionApplication.updateMany({
        where: { sessionId, id: { not: applicationId }, status: 'PENDING' },
        data: { status: 'REJECTED' },
      });

      await notificationService.create(application.applicantId, {
        type: 'SESSION_APPLICATION_ACCEPTED',
        title: 'Application Accepted!',
        message: `${teacher?.displayName} accepted your application for ${session.skill.name}`,
        data: { sessionId, applicationId, meetingUrl: session.meetingUrl },
      });

      const learner = await prisma.user.findUnique({
        where: { id: application.applicantId },
        select: { email: true },
      });
      if (learner?.email) {
        await emailService.sendSessionConfirmation(learner.email, {
          partnerName: session.teacher.displayName,
          skillName: session.skill.name,
          scheduledAt: session.scheduledAt,
          meetingUrl: session.meetingUrl ?? undefined,
        });
      }
    } else {
      await notificationService.create(application.applicantId, {
        type: 'SESSION_APPLICATION_REJECTED',
        title: 'Application Not Selected',
        message: `Your application for the ${session.skill.name} session was not selected`,
        data: { sessionId, applicationId },
      });
    }

    return updated;
  }

  // ── Read Endpoints ────────────────────────────────────────────────────────────

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
          teacher: {
            select: {
              id: true, username: true, displayName: true, avatarUrl: true,
              averageRating: true, ratingCount: true, totalSessionsTaught: true, isVerified: true,
            },
          },
          applications: { where: { applicantId: userId }, select: { id: true, status: true } },
          _count: { select: { applications: true } },
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
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + sessions.length < total,
        hasPrev: page > 1,
      },
    };
  }

  async getSessions(userId: string, role: 'teacher' | 'learner' | 'all', page: number, limit: number, status?: string) {
    const skip = (page - 1) * limit;

    const roleWhere =
      role === 'all'
        ? { OR: [{ teacherId: userId }, { learnerId: userId }] }
        : role === 'teacher'
        ? { teacherId: userId }
        : { learnerId: userId };

    const where = {
      ...roleWhere,
      ...(status ? { status: status as never } : {}),
    };

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        include: {
          skill: true,
          teacher: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          learner: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          ratings: true,
          testimonials: { where: { authorId: userId }, select: { id: true } },
        },
        skip,
        take: limit,
        orderBy: { scheduledAt: 'desc' },
      }),
      prisma.session.count({ where }),
    ]);

    // Only expose meeting URL to confirmed participants
    const maskedSessions = sessions.map((s) => ({
      ...s,
      meetingUrl:
        ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'RATED'].includes(s.status) &&
        (s.teacherId === userId || s.learnerId === userId)
          ? s.meetingUrl
          : null,
    }));

    return {
      data: maskedSessions,
      pagination: {
        page, limit, total,
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
        testimonials: {
          include: { author: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
        },
        applications: {
          include: { applicant: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
        },
      },
    });

    if (!session) throw new AppError('Session not found', 404);

    const isParticipant = session.teacherId === userId || session.learnerId === userId;
    if (!session.isPublic && !isParticipant) throw new AppError('Access denied', 403);

    // Mask meeting URL until confirmed and participant
    const isConfirmed = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'RATED'].includes(session.status);
    return {
      ...session,
      meetingUrl: isConfirmed && isParticipant ? session.meetingUrl : null,
    };
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
    if (session.teacherId !== userId && session.learnerId !== userId) throw new AppError('Access denied', 403);

    const start = session.scheduledAt;
    const end = new Date(start.getTime() + session.durationMinutes * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const summary = `${session.skill.name} Session with ${session.teacher.displayName}`;
    const description = session.agenda
      ? `Agenda: ${session.agenda}`
      : session.notes
      ? `Notes: ${session.notes}`
      : `1hrLearning session: ${session.skill.name}`;
    const location = session.meetingUrl ?? 'Online';

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//1hrLearning//OKE//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:session-${session.id}@1hrlearning`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      `ORGANIZER;CN=${session.teacher.displayName}:mailto:${session.teacher.email}`,
      ...(session.learner?.email
        ? [`ATTENDEE;CN=${session.learner.displayName}:mailto:${session.learner.email}`]
        : []),
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }

  // ── Internal ─────────────────────────────────────────────────────────────────

  private async _checkWeeklyLimit(teacherId: string, maxPerWeek: number): Promise<void> {
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      select: { weeklySessionsShared: true, weeklySessionsResetAt: true },
    });
    if (!teacher) return;

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    if (teacher.weeklySessionsResetAt < weekStart) {
      await prisma.user.update({
        where: { id: teacherId },
        data: { weeklySessionsShared: 1, weeklySessionsResetAt: now },
      });
    } else {
      if (teacher.weeklySessionsShared >= maxPerWeek) {
        throw new AppError(`You can only share ${maxPerWeek} sessions per week`, 429);
      }
      await prisma.user.update({
        where: { id: teacherId },
        data: { weeklySessionsShared: { increment: 1 } },
      });
    }
  }

  private async _handleCompletion(
    sessionId: string,
    teacherId: string,
    learnerId: string,
    skillId: string,
    durationMinutes: number,
  ): Promise<void> {
    const [skill, learner, teacher] = await Promise.all([
      prisma.skill.findUnique({ where: { id: skillId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: learnerId }, select: { displayName: true, email: true } }),
      prisma.user.findUnique({ where: { id: teacherId }, select: { displayName: true, email: true } }),
    ]);

    await Promise.all([
      pointsService.transfer(learnerId, teacherId, sessionId, `${durationMinutes}-min session completion`),
      prisma.user.update({ where: { id: teacherId }, data: { totalSessionsTaught: { increment: 1 }, lastPointActivityAt: new Date() } }),
      prisma.user.update({ where: { id: learnerId }, data: { totalSessionsLearned: { increment: 1 } } }),
      prisma.skill.update({ where: { id: skillId }, data: { sessionCount: { increment: 1 } } }),
    ]);

    const per30 = await getPointConfig(POINT_CONFIG_KEYS.PER_30_MIN, POINTS.PER_30_MIN);
    const earned = calcSessionPoints(durationMinutes, per30);

    await Promise.all([
      notificationService.create(teacherId, {
        type: 'SESSION_COMPLETED',
        title: 'Session Completed',
        message: `Session complete — you earned ${earned} points!`,
        data: { sessionId, pointsEarned: earned },
      }),
      notificationService.create(learnerId, {
        type: 'SESSION_COMPLETED',
        title: 'Session Completed',
        message: 'Session complete — please rate your experience.',
        data: { sessionId },
      }),
    ]);

    // Send rate prompt email to learner
    if (learner?.email && teacher && skill) {
      await emailService.sendRatePrompt(
        learner.email,
        learner.displayName,
        `${process.env.FRONTEND_URL || 'https://1hrlearning.com'}/sessions/${sessionId}/rate`,
        teacher.displayName,
        skill.name,
      );
    }

    // Check if learner balance is low after spending
    await pointsService.checkAndNotifyLowBalance(learnerId);
  }
}

export const sessionsService = new SessionsService();
