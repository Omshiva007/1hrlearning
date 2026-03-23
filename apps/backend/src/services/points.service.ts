import { prisma } from '../utils/prisma';
import { AppError } from '../types';
import type { PointTransactionType } from '@1hrlearning/shared';

export class PointsService {
  async getBalance(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pointsBalance: true },
    });
    if (!user) throw new AppError('User not found', 404);
    return { balance: user.pointsBalance };
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

  async transfer(fromUserId: string, toUserId: string, amount: number, sessionId: string, description: string) {
    return prisma.$transaction(async (tx) => {
      const fromUser = await tx.user.findUnique({ where: { id: fromUserId }, select: { pointsBalance: true } });
      if (!fromUser) throw new AppError('User not found', 404);
      if (fromUser.pointsBalance < amount) throw new AppError('Insufficient points', 400);

      const [updatedFrom, updatedTo] = await Promise.all([
        tx.user.update({
          where: { id: fromUserId },
          data: { pointsBalance: { decrement: amount } },
          select: { pointsBalance: true },
        }),
        tx.user.update({
          where: { id: toUserId },
          data: { pointsBalance: { increment: amount } },
          select: { pointsBalance: true },
        }),
      ]);

      await Promise.all([
        tx.pointTransaction.create({
          data: {
            userId: fromUserId,
            type: 'SPENT_LEARNING',
            amount: -amount,
            balanceAfter: updatedFrom.pointsBalance,
            description,
            sessionId,
          },
        }),
        tx.pointTransaction.create({
          data: {
            userId: toUserId,
            type: 'EARNED_TEACHING',
            amount,
            balanceAfter: updatedTo.pointsBalance,
            description,
            sessionId,
          },
        }),
      ]);
    });
  }

  async awardBonus(userId: string, amount: number, description: string, type: PointTransactionType = 'BONUS') {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { pointsBalance: { increment: amount } },
        select: { pointsBalance: true },
      });

      await tx.pointTransaction.create({
        data: {
          userId,
          type,
          amount,
          balanceAfter: updated.pointsBalance,
          description,
        },
      });
    });
  }
}

export const pointsService = new PointsService();
