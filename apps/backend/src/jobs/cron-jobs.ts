import { backgroundJobsService } from '../services/background-jobs.service';
import { sessionsService } from '../services/sessions.service';
import { logger } from '../utils/logger';

/**
 * Scheduled jobs that run periodically
 */

export async function runEmailJobs(): Promise<void> {
  logger.info('Starting email background jobs...');

  try {
    const onboardingCount = await backgroundJobsService.sendOnboardingReminders();
    logger.info(`Sent ${onboardingCount} onboarding reminder emails`);
  } catch (error) {
    logger.error('Error sending onboarding reminders:', error);
  }

  try {
    const expiryCount = await backgroundJobsService.sendPointsExpiryWarnings();
    logger.info(`Sent ${expiryCount} points expiry warning emails`);
  } catch (error) {
    logger.error('Error sending points expiry warnings:', error);
  }

  try {
    const reengagementCount = await backgroundJobsService.sendReEngagementEmails();
    logger.info(`Sent ${reengagementCount} re-engagement emails`);
  } catch (error) {
    logger.error('Error sending re-engagement emails:', error);
  }
}

export async function runSessionJobs(): Promise<void> {
  logger.info('Starting session background jobs...');

  try {
    const completedCount = await sessionsService.autoCompletePastSessions();
    logger.info(`Auto-completed ${completedCount} past sessions`);
  } catch (error) {
    logger.error('Error auto-completing sessions:', error);
  }

  try {
    const expiredCount = await backgroundJobsService.expireStalePoints();
    logger.info(`Expired ${expiredCount} stale point transactions`);
  } catch (error) {
    logger.error('Error expiring stale points:', error);
  }
}

/**
 * Main function to run all jobs
 * Can be called by a cron scheduler or externally
 */
export async function runAllBackgroundJobs(): Promise<void> {
  logger.info('=== Running all background jobs ===');
  await Promise.all([
    runEmailJobs(),
    runSessionJobs(),
  ]);
  logger.info('=== Background jobs completed ===');
}
