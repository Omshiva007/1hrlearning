import { prisma } from '../utils/prisma';
import { AppError } from '../types';
import { POINTS, POINT_CONFIG_KEYS } from '@1hrlearning/shared';
import type { PointTransactionType } from '@1hrlearning/shared';
import { notificationService } from './notification.service';
import { emailService } from './email.service';

/** Returns points for a given duration based on the 30-min=5-pts base rule (or configured rate). */
export function calcSessionPoints(durationMinutes: number, pointsPer30Min = POINTS.PER_30_MIN): number {
  return Math.round((durationMinutes / 30) * pointsPer30Min);
}

/** Load a point rule value from DB config, falling back to the hardcoded constant. */
async function getConfigValue(key: string, fallback: number): Promise<number> {
  const config = await prisma.pointConfig.findUnique({ where: { key } });
  return config ? config.value : fallback;
}

export class PointsService {
  async getBalance(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pointsBalance: true, pointsLocked: true },
    });
    if (!user) throw new AppError('User not found', 404);
    return { balance: user.pointsBalance, locked: user.pointsLocked };
  }

  async getHistory(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      prisma.pointTransaction.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { session: { include: { skill: true } } },
      }),
      prisma.pointTransaction.count({ where: { userId } }),
    ]);

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + transactions.length < total,
        hasPrev: page > 1,
      },
    };
  }

  /** Lock points for a learner when a session is confirmed. */
  async lockPoints(learnerId: string, sessionId: string, durationMinutes: number): Promise<void> {
    const per30Min = await getConfigValue(POINT_CONFIG_KEYS.PER_30_MIN, POINTS.PER_30_MIN);
    const amount = calcSessionPoints(durationMinutes, per30Min);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: learnerId },
        select: { pointsBalance: true },
      });
      if (!user) throw new AppError('User not found', 404);
      if (user.pointsBalance < amount) throw new AppError('Insufficient points to confirm session', 400);

      await tx.user.update({
        where: { id: learnerId },
        data: {
          pointsBalance: { decrement: amount },
          pointsLocked: { increment: amount },
        },
      });

      await tx.session.update({
        where: { id: sessionId },
        data: {
          pointsLocked: true,
          pointsLockedAt: new Date(),
          pointsPerSession: amount,
        },
      });
    });
  }

  /** Release locked points back to learner (session declined or cancelled before completion). */
  async releaseLockedPoints(learnerId: string, sessionId: string): Promise<void> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { pointsLocked: true, pointsPerSession: true },
    });
    if (!session?.pointsLocked) return;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: learnerId },
        data: {
          pointsBalance: { increment: session.pointsPerSession },
          pointsLocked: { decrement: session.pointsPerSession },
        },
      });
      await tx.session.update({
        where: { id: sessionId },
        data: { pointsLocked: false },
      });
      await tx.pointTransaction.create({
        data: {
          userId: learnerId,
          type: 'REFUND',
          amount: session.pointsPerSession,
          balanceAfter: 0, // will be recalculated
          description: 'Session cancelled — points returned',
          sessionId,
        },
      });
    });

    const updated = await prisma.user.findUnique({ where: { id: learnerId }, select: { pointsBalance: true } });
    if (updated) {
      await prisma.pointTransaction.updateMany({
        where: { sessionId, type: 'REFUND' },
        data: { balanceAfter: updated.pointsBalance },
      });
    }
  }

  /** Transfer locked points from learner to sharer on session completion. */
  async transfer(fromUserId: string, toUserId: string, sessionId: string, description: string): Promise<void> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { pointsPerSession: true, pointsLocked: true },
    });
    if (!session) throw new AppError('Session not found', 404);

    const amount = session.pointsPerSession;
    const maxBalance = await getConfigValue(POINT_CONFIG_KEYS.MAX_BALANCE, POINTS.MAX_BALANCE);

    await prisma.$transaction(async (tx) => {
      // Deduct from locked pool (not from balance — already deducted on lock)
      const fromUser = await tx.user.findUnique({ where: { id: fromUserId }, select: { pointsLocked: true } });
      if (!fromUser) throw new AppError('User not found', 404);

      const toUser = await tx.user.findUnique({ where: { id: toUserId }, select: { pointsBalance: true } });
      if (!toUser) throw new AppError('User not found', 404);

      // Cap sharer balance at max
      const newSharerBalance = Math.min(toUser.pointsBalance + amount, maxBalance);
      const actualEarned = newSharerBalance - toUser.pointsBalance;

      await tx.user.update({
        where: { id: fromUserId },
        data: { pointsLocked: { decrement: amount } },
      });

      const updatedTo = await tx.user.update({
        where: { id: toUserId },
        data: { pointsBalance: newSharerBalance, lastPointActivityAt: new Date() },
        select: { pointsBalance: true },
      });

      const updatedFrom = await tx.user.findUnique({
        where: { id: fromUserId },
        select: { pointsBalance: true },
      });

      await Promise.all([
        tx.pointTransaction.create({
          data: {
            userId: fromUserId,
            type: 'SPENT_LEARNING',
            amount: -amount,
            balanceAfter: updatedFrom?.pointsBalance ?? 0,
            description,
            sessionId,
          },
        }),
        tx.pointTransaction.create({
          data: {
            userId: toUserId,
            type: 'EARNED_TEACHING',
            amount: actualEarned,
            balanceAfter: updatedTo.pointsBalance,
            description,
            sessionId,
          },
        }),
      ]);

      await tx.session.update({ where: { id: sessionId }, data: { pointsLocked: false } });
    });
  }

  /** Award rating bonus to sharer after learner submits a rating. */
  async awardRatingBonus(sharerId: string, score: number, sessionId: string): Promise<void> {
    const bonusMap: Record<number, keyof typeof POINTS> = {
      5: 'RATING_BONUS_5_STAR',
      4: 'RATING_BONUS_4_STAR',
      3: 'RATING_BONUS_3_STAR',
    };

    const configKeyMap: Record<number, string> = {
      5: POINT_CONFIG_KEYS.RATING_BONUS_5_STAR,
      4: POINT_CONFIG_KEYS.RATING_BONUS_4_STAR,
      3: POINT_CONFIG_KEYS.RATING_BONUS_3_STAR,
    };

    const constKey = bonusMap[score];
    if (!constKey) return; // 1-2 star: no bonus

    const fallback = POINTS[constKey] as number;
    const bonus = await getConfigValue(configKeyMap[score]!, fallback);
    if (bonus <= 0) return;

    const maxBalance = await getConfigValue(POINT_CONFIG_KEYS.MAX_BALANCE, POINTS.MAX_BALANCE);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: sharerId }, select: { pointsBalance: true } });
      if (!user) return;

      const newBalance = Math.min(user.pointsBalance + bonus, maxBalance);
      const actualBonus = newBalance - user.pointsBalance;
      if (actualBonus <= 0) return;

      const updated = await tx.user.update({
        where: { id: sharerId },
        data: { pointsBalance: newBalance, lastPointActivityAt: new Date() },
        select: { pointsBalance: true },
      });

      await tx.pointTransaction.create({
        data: {
          userId: sharerId,
          type: 'BONUS',
          amount: actualBonus,
          balanceAfter: updated.pointsBalance,
          description: `${score}-star rating bonus`,
          sessionId,
        },
      });
    });
  }

  /** Apply no-show penalty to sharer; release locked points to learner. */
  async applySharerNoShowPenalty(sharerId: string, learnerId: string, sessionId: string): Promise<void> {
    const penalty = await getConfigValue(POINT_CONFIG_KEYS.NO_SHOW_SHARER_PENALTY, POINTS.NO_SHOW_SHARER_PENALTY);

    await this.releaseLockedPoints(learnerId, sessionId);

    await prisma.$transaction(async (tx) => {
      const sharer = await tx.user.findUnique({ where: { id: sharerId }, select: { pointsBalance: true } });
      if (!sharer) return;

      const deduction = Math.min(penalty, sharer.pointsBalance); // cannot go below 0
      if (deduction <= 0) return;

      const updated = await tx.user.update({
        where: { id: sharerId },
        data: { pointsBalance: { decrement: deduction } },
        select: { pointsBalance: true },
      });

      await tx.pointTransaction.create({
        data: {
          userId: sharerId,
          type: 'PENALTY',
          amount: -deduction,
          balanceAfter: updated.pointsBalance,
          description: 'No-show penalty',
          sessionId,
        },
      });
    });
  }

  /** Forfeit learner locked points when learner no-shows (sharer gets full credit). */
  async applyLearnerNoShow(learnerId: string, sharerId: string, sessionId: string): Promise<void> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { pointsPerSession: true },
    });
    if (!session) return;

    const maxBalance = await getConfigValue(POINT_CONFIG_KEYS.MAX_BALANCE, POINTS.MAX_BALANCE);

    await prisma.$transaction(async (tx) => {
      // Learner locked points are forfeited — just decrement from locked pool
      await tx.user.update({
        where: { id: learnerId },
        data: { pointsLocked: { decrement: session.pointsPerSession } },
      });

      // Sharer receives full credit
      const sharer = await tx.user.findUnique({ where: { id: sharerId }, select: { pointsBalance: true } });
      if (!sharer) return;
      const newBalance = Math.min(sharer.pointsBalance + session.pointsPerSession, maxBalance);
      const actualEarned = newBalance - sharer.pointsBalance;

      const updatedFrom = await tx.user.findUnique({ where: { id: learnerId }, select: { pointsBalance: true } });
      const updatedTo = await tx.user.update({
        where: { id: sharerId },
        data: { pointsBalance: newBalance, lastPointActivityAt: new Date() },
        select: { pointsBalance: true },
      });

      await Promise.all([
        tx.pointTransaction.create({
          data: {
            userId: learnerId,
            type: 'PENALTY',
            amount: -session.pointsPerSession,
            balanceAfter: updatedFrom?.pointsBalance ?? 0,
            description: 'No-show — points forfeited',
            sessionId,
          },
        }),
        actualEarned > 0
          ? tx.pointTransaction.create({
              data: {
                userId: sharerId,
                type: 'EARNED_TEACHING',
                amount: actualEarned,
                balanceAfter: updatedTo.pointsBalance,
                description: 'Learner no-show — full credit awarded',
                sessionId,
              },
            })
          : Promise.resolve(),
      ]);

      await tx.session.update({ where: { id: sessionId }, data: { pointsLocked: false } });
    });
  }

  /** Expire points for users inactive for more than the configured period. */
  async expireStalePoints(): Promise<number> {
    const expiryMonths = await getConfigValue(POINT_CONFIG_KEYS.EXPIRY_MONTHS, POINTS.EXPIRY_MONTHS);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - expiryMonths);

    const staleUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        pointsBalance: { gt: 0 },
        lastPointActivityAt: { lt: cutoff },
      },
      select: { id: true, pointsBalance: true },
    });

    let expired = 0;
    for (const user of staleUsers) {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { pointsBalance: 0 },
        });
        await tx.pointTransaction.create({
          data: {
            userId: user.id,
            type: 'EXPIRY',
            amount: -user.pointsBalance,
            balanceAfter: 0,
            description: `Points expired after ${expiryMonths} months of inactivity`,
          },
        });
      });

      await notificationService.create(user.id, {
        type: 'POINTS_EXPIRY_WARNING',
        title: 'Points Expired',
        message: `Your ${user.pointsBalance} points have expired due to inactivity. Share a session to earn more!`,
        data: {},
      });

      expired++;
    }

    return expired;
  }

  /** Admin manual point grant/deduct with mandatory reason and audit. */
  async adminAdjust(
    adminId: string,
    targetUserId: string,
    action: 'GRANT' | 'DEDUCT' | 'RESET',
    amount: number,
    reason: string,
    notifyUser: boolean,
    ipAddress?: string,
  ): Promise<void> {
    const maxBalance = await getConfigValue(POINT_CONFIG_KEYS.MAX_BALANCE, POINTS.MAX_BALANCE);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: targetUserId },
        select: { pointsBalance: true },
      });
      if (!user) throw new AppError('User not found', 404);

      const before = user.pointsBalance;
      let after: number;
      let txAmount: number;
      let txType: 'ADMIN_GRANT' | 'ADMIN_DEDUCT';

      if (action === 'GRANT') {
        after = Math.min(before + amount, maxBalance);
        txAmount = after - before;
        txType = 'ADMIN_GRANT';
      } else if (action === 'DEDUCT') {
        after = Math.max(before - amount, 0);
        txAmount = after - before;
        txType = 'ADMIN_DEDUCT';
      } else {
        // RESET
        after = amount;
        txAmount = after - before;
        txType = txAmount >= 0 ? 'ADMIN_GRANT' : 'ADMIN_DEDUCT';
      }

      await tx.user.update({
        where: { id: targetUserId },
        data: { pointsBalance: after },
      });

      await tx.pointTransaction.create({
        data: {
          userId: targetUserId,
          type: txType,
          amount: txAmount,
          balanceAfter: after,
          description: reason,
          adminNote: `Admin action by ${adminId}: ${action} ${amount} pts`,
        },
      });

      await tx.auditLog.create({
        data: {
          adminId,
          actionType: `POINT_${action}`,
          targetType: 'USER',
          targetId: targetUserId,
          beforeValue: { pointsBalance: before },
          afterValue: { pointsBalance: after },
          reason,
          ipAddress: ipAddress ?? null,
        },
      });
    });

    if (notifyUser) {
      const action_label = action === 'GRANT' ? 'credited' : 'adjusted';
      await notificationService.create(targetUserId, {
        type: 'POINTS_EARNED',
        title: 'Points Updated',
        message: `Your points balance has been ${action_label} by an admin. Reason: ${reason}`,
        data: { reason },
      });
    }
  }

  /** Notify user when balance drops to low threshold. */
  async checkAndNotifyLowBalance(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pointsBalance: true, displayName: true, email: true },
    });
    if (!user) return;
    if (user.pointsBalance > 0 && user.pointsBalance <= POINTS.BALANCE_LOW_THRESHOLD) {
      await notificationService.create(userId, {
        type: 'BALANCE_LOW',
        title: 'Points Running Low',
        message: `You have ${user.pointsBalance} points left. Share a session to earn more!`,
        data: { balance: user.pointsBalance },
      });

      // Send email warning
      if (user.email) {
        const action = user.pointsBalance === 0
          ? 'You have no points left. Share a session to earn more!'
          : `You need ${POINTS.PER_30_MIN} points to book a 30-minute session. Share a session to earn more!`;
        await emailService.sendPointsLowWarning(user.email, user.displayName, user.pointsBalance, action);
      }
    }
  }

  async awardBonus(
    userId: string,
    amount: number,
    description: string,
    type: PointTransactionType = 'BONUS',
    sessionId?: string,
  ) {
    const maxBalance = await getConfigValue(POINT_CONFIG_KEYS.MAX_BALANCE, POINTS.MAX_BALANCE);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { pointsBalance: true } });
      if (!user) return;

      const newBalance = Math.min(user.pointsBalance + amount, maxBalance);
      const actualAmount = newBalance - user.pointsBalance;
      if (actualAmount <= 0) return;

      const updated = await tx.user.update({
        where: { id: userId },
        data: { pointsBalance: newBalance, lastPointActivityAt: new Date() },
        select: { pointsBalance: true },
      });

      await tx.pointTransaction.create({
        data: {
          userId,
          type,
          amount: actualAmount,
          balanceAfter: updated.pointsBalance,
          description,
          sessionId: sessionId ?? null,
        },
      });
    });
  }
}

export const pointsService = new PointsService();
