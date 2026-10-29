import type { SessionStatus } from '@prisma/client';
import type { UpdateSessionInput } from '@1hrlearning/shared';
import { AppError } from '../types';

type ParticipantRole = 'teacher' | 'learner';

const transitionRules: Record<SessionStatus, Partial<Record<SessionStatus, readonly ParticipantRole[]>>> = {
  PENDING: { CONFIRMED: ['teacher'], CANCELLED: ['teacher', 'learner'] },
  CONFIRMED: {
    IN_PROGRESS: ['teacher'],
    COMPLETED: ['teacher'],
    CANCELLED: ['teacher', 'learner'],
    NO_SHOW: ['teacher'],
  },
  IN_PROGRESS: { COMPLETED: ['teacher'], CANCELLED: ['teacher', 'learner'], NO_SHOW: ['teacher'] },
  COMPLETED: {},
  CANCELLED: {},
  NO_SHOW: {},
  RATED: {},
};

interface SessionUpdateContext {
  currentStatus: SessionStatus;
  role: ParticipantRole;
  hasLearner: boolean;
  input: UpdateSessionInput;
}

export function assertSessionUpdateAllowed(context: SessionUpdateContext): void {
  const { currentStatus, role, hasLearner, input } = context;
  // The shared schema validates this at the API boundary; narrowing here preserves Prisma's enum contract across Zod versions.
  const requestedStatus = input.status as SessionStatus | undefined;

  if (requestedStatus) {
    const allowedRoles = transitionRules[currentStatus][requestedStatus];
    if (!allowedRoles) {
      // State transitions are one-way so retries and terminal-state mutation cannot repeat side effects.
      throw new AppError(`Cannot change session from ${currentStatus} to ${requestedStatus}`, 409);
    }
    if (!allowedRoles.includes(role)) {
      throw new AppError(`Only the ${allowedRoles.join(' or ')} can perform this session transition`, 403);
    }
    if (['CONFIRMED', 'COMPLETED', 'NO_SHOW'].includes(requestedStatus) && !hasLearner) {
      throw new AppError(`Cannot mark a session ${requestedStatus.toLowerCase()} without a learner`, 409);
    }
  }

  if (input.scheduledAt && (role !== 'teacher' || currentStatus !== 'PENDING')) {
    throw new AppError('Only the sharer can reschedule a pending session', 403);
  }
  if (input.meetingUrl !== undefined && (role !== 'teacher' || !['PENDING', 'CONFIRMED'].includes(currentStatus))) {
    throw new AppError('Meeting links can only be changed by the sharer before the session starts', 403);
  }
  if (input.notes !== undefined && (role !== 'teacher' || !['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(currentStatus))) {
    throw new AppError('Session notes can only be changed by the sharer before completion', 403);
  }
  if (input.cancelReason !== undefined && requestedStatus !== 'CANCELLED') {
    // A cancellation reason is part of the terminal audit trail and cannot be edited independently.
    throw new AppError('A cancellation reason may only be supplied while cancelling the session', 400);
  }
}
