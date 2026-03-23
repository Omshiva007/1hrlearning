import sgMail from '@sendgrid/mail';
import { config } from '../config';
import { logger } from '../utils/logger';

if (config.email.sendgridApiKey) {
  sgMail.setApiKey(config.email.sendgridApiKey);
}

export class EmailService {
  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!config.email.sendgridApiKey) {
      logger.debug(`[Email] Would send to ${to}: ${subject}`);
      return;
    }

    try {
      await sgMail.send({
        to,
        from: config.email.from,
        subject,
        html,
      });
      logger.info(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      logger.error('Failed to send email:', error);
    }
  }

  async sendWelcome(to: string, displayName: string): Promise<void> {
    await this.send(
      to,
      'Welcome to 1hrLearning!',
      `<h1>Welcome, ${displayName}!</h1>
       <p>You've joined the Open Knowledge Exchange Platform.</p>
       <p>Start by adding your skills and finding matches!</p>
       <a href="${config.app.url}/dashboard">Go to Dashboard</a>`,
    );
  }

  async sendSessionConfirmation(to: string, sessionDetails: {
    partnerName: string;
    skillName: string;
    scheduledAt: Date;
    meetingUrl?: string;
  }): Promise<void> {
    await this.send(
      to,
      'Session Confirmed - 1hrLearning',
      `<h1>Your session is confirmed!</h1>
       <p><strong>Partner:</strong> ${sessionDetails.partnerName}</p>
       <p><strong>Skill:</strong> ${sessionDetails.skillName}</p>
       <p><strong>Time:</strong> ${sessionDetails.scheduledAt.toISOString()}</p>
       ${sessionDetails.meetingUrl ? `<p><strong>Meeting URL:</strong> <a href="${sessionDetails.meetingUrl}">${sessionDetails.meetingUrl}</a></p>` : ''}`,
    );
  }

  async sendSessionReminder(to: string, sessionDetails: {
    partnerName: string;
    skillName: string;
    scheduledAt: Date;
    meetingUrl?: string;
  }): Promise<void> {
    await this.send(
      to,
      'Session Reminder - Starting in 30 minutes',
      `<h1>Your session starts in 30 minutes!</h1>
       <p><strong>Partner:</strong> ${sessionDetails.partnerName}</p>
       <p><strong>Skill:</strong> ${sessionDetails.skillName}</p>
       ${sessionDetails.meetingUrl ? `<p><a href="${sessionDetails.meetingUrl}">Join Session</a></p>` : ''}`,
    );
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    await this.send(
      to,
      'Password Reset - 1hrLearning',
      `<h1>Reset Your Password</h1>
       <p>Click the link below to reset your password. This link expires in 1 hour.</p>
       <a href="${resetUrl}">Reset Password</a>
       <p>If you didn't request this, ignore this email.</p>`,
    );
  }
}

export const emailService = new EmailService();
