import { prisma } from '../utils/prisma';
import { emailService } from './email.service';
import { notificationService } from './notification.service';
import { POINTS } from '@1hrlearning/shared';
import { logger } from '../utils/logger';

export class BackgroundJobsService {
  /**
   * Send onboarding reminder to users who haven't completed onboarding
   * and registered more than 24 hours ago
   */
  async sendOnboardingReminders(): Promise<number> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const incompleteUsers = await prisma.user.findMany({
      where: {
        isOnboardingComplete: false,
        createdAt: { lt: oneDayAgo },
        isActive: true,
        // Only send if we haven't already sent one in the last 3 days
        lastOnboardingReminderAt: {
          lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      },
      select: { id: true, email: true, displayName: true },
      take: 100,
    });

    let sent = 0;
    for (const user of incompleteUsers) {
      try {
        if (user.email) {
          const completionUrl = `${process.env.FRONTEND_URL || 'https://1hrlearning.com'}/onboarding`;
          await emailService.sendOnboardingReminder(user.email, user.displayName, completionUrl);

          await prisma.user.update({
            where: { id: user.id },
            data: { lastOnboardingReminderAt: new Date() },
          });

          sent++;
        }
      } catch (error) {
        logger.error(`Failed to send onboarding reminder to ${user.id}:`, error);
      }
    }

    return sent;
  }

  /**
   * Send points expiry warning to users with points expiring in the next 7 days
   */
  async sendPointsExpiryWarnings(): Promise<number> {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

    // Find users with points that are about to expire
    const usersWithExpiringPoints = await prisma.pointTransaction.groupBy({
      by: ['userId'],
      where: {
        type: { in: ['EARNED', 'BONUS'] },
        createdAt: {
          lt: sixMonthsAgo,
          gt: new Date(sixMonthsAgo.getTime() - 1 * 24 * 60 * 60 * 1000), // Within 1 day of 6 months
        },
      },
      _sum: { amount: true },
    });

    let sent = 0;
    for (const record of usersWithExpiringPoints) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: record.userId },
          select: { email: true, displayName: true },
        });

        if (user?.email && record._sum.amount) {
          const expiryDate = new Date(sixMonthsAgo.getTime() + 180 * 24 * 60 * 60 * 1000);
          await emailService.sendPointsExpiryWarning(
            user.email,
            user.displayName,
            record._sum.amount,
            expiryDate,
          );
          sent++;
        }
      } catch (error) {
        logger.error(`Failed to send points expiry warning to ${record.userId}:`, error);
      }
    }

    return sent;
  }

  /**
   * Send re-engagement emails to inactive users
   * (no activity in the last 30 days)
   */
  async sendReEngagementEmails(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const eightyDaysAgo = new Date(Date.now() - 80 * 24 * 60 * 60 * 1000);

    const inactiveUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        isSuspended: false,
        isBanned: false,
        lastActiveAt: {
          lt: thirtyDaysAgo,
          gt: eightyDaysAgo, // Don't re-engage too frequently
        },
      },
      select: { id: true, email: true, displayName: true, lastActiveAt: true },
      take: 100,
    });

    let sent = 0;
    for (const user of inactiveUsers) {
      try {
        if (user.email && user.lastActiveAt) {
          const daysSinceActive = Math.floor(
            (Date.now() - user.lastActiveAt.getTime()) / (24 * 60 * 60 * 1000),
          );
          const reengagementUrl = `${process.env.FRONTEND_URL || 'https://1hrlearning.com'}/discover`;

          await emailService.sendReEngagementEmail(
            user.email,
            user.displayName,
            daysSinceActive,
            reengagementUrl,
          );

          sent++;
        }
      } catch (error) {
        logger.error(`Failed to send re-engagement email to ${user.id}:`, error);
      }
    }

    return sent;
  }

  /**
   * Expire points that haven't been active for 6 months
   */
  async expireStalePoints(): Promise<number> {
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

    const usersWithStalePoints = await prisma.pointTransaction.findMany({
      where: {
        type: { in: ['EARNED', 'BONUS'] },
        createdAt: { lt: sixMonthsAgo },
        status: 'ACTIVE',
      },
      select: { userId: true, amount: true, id: true },
      take: 1000,
    });

    let expired = 0;
    for (const transaction of usersWithStalePoints) {
      try {
        // Create an EXPIRED transaction to record the expiry
        await prisma.pointTransaction.create({
          data: {
            userId: transaction.userId,
            type: 'EXPIRED',
            amount: -transaction.amount,
            description: `Points expired after 6 months of inactivity`,
            balanceAfter: 0, // This will be updated by the transaction handler
          },
        });

        // Update user balance
        const user = await prisma.user.findUnique({
          where: { id: transaction.userId },
          select: { pointsBalance: true },
        });

        if (user) {
          const newBalance = Math.max(0, user.pointsBalance - transaction.amount);
          await prisma.user.update({
            where: { id: transaction.userId },
            data: { pointsBalance: newBalance },
          });

          // Notify user
          await notificationService.create(transaction.userId, {
            type: 'POINTS_EXPIRED',
            title: 'Points Expired',
            message: `${transaction.amount} points have expired due to inactivity.`,
            data: { expiredAmount: transaction.amount },
          });
        }

        expired++;
      } catch (error) {
        logger.error(`Failed to expire points for transaction ${transaction.id}:`, error);
      }
    }

    return expired;
  }
}

export const backgroundJobsService = new BackgroundJobsService();
