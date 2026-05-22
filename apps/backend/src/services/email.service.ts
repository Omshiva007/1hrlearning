import sgMail from '@sendgrid/mail';
import { config } from '../config';
import { logger } from '../utils/logger';

if (config.email.sendgridApiKey) {
  sgMail.setApiKey(config.email.sendgridApiKey);
}

function htmlEncode(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
      `<h1>Welcome, ${htmlEncode(displayName)}!</h1>
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
       <p><strong>Partner:</strong> ${htmlEncode(sessionDetails.partnerName)}</p>
       <p><strong>Skill:</strong> ${htmlEncode(sessionDetails.skillName)}</p>
       <p><strong>Time:</strong> ${sessionDetails.scheduledAt.toISOString()}</p>
       ${sessionDetails.meetingUrl ? `<p><strong>Meeting URL:</strong> <a href="${htmlEncode(sessionDetails.meetingUrl)}">${htmlEncode(sessionDetails.meetingUrl)}</a></p>` : ''}`,
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
       <p><strong>Partner:</strong> ${htmlEncode(sessionDetails.partnerName)}</p>
       <p><strong>Skill:</strong> ${htmlEncode(sessionDetails.skillName)}</p>
       ${sessionDetails.meetingUrl ? `<p><a href="${htmlEncode(sessionDetails.meetingUrl)}">Join Session</a></p>` : ''}`,
    );
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    await this.send(
      to,
      'Password Reset - 1hrLearning',
      `<h1>Reset Your Password</h1>
       <p>Click the link below to reset your password. This link expires in 1 hour.</p>
       <a href="${htmlEncode(resetUrl)}">Reset Password</a>
       <p>If you didn't request this, ignore this email.</p>`,
    );
  }

  async sendOnboardingReminder(to: string, displayName: string, completionUrl: string): Promise<void> {
    await this.send(
      to,
      'Complete Your 1hrLearning Profile',
      `<h1>Welcome, ${htmlEncode(displayName)}!</h1>
       <p>We noticed you haven't finished setting up your profile yet.</p>
       <p>Completing your profile helps us find better matches for you. It only takes a few minutes!</p>
       <p>Your profile will include:</p>
       <ul>
         <li>Skills you want to teach</li>
         <li>Skills you want to learn</li>
         <li>Your availability</li>
       </ul>
       <a href="${htmlEncode(completionUrl)}">Complete Your Profile</a>
       <p>Questions? Reply to this email or visit our help center.</p>`,
    );
  }

  async sendFirstMatchFound(to: string, displayName: string, matchDetails: {
    matchName: string;
    skillName: string;
    matchUrl: string;
  }): Promise<void> {
    await this.send(
      to,
      'Great news! We found your first match on 1hrLearning',
      `<h1>Your First Match!</h1>
       <p>Hi ${htmlEncode(displayName)},</p>
       <p>Congratulations! We found someone who can help you learn <strong>${htmlEncode(matchDetails.skillName)}</strong>:</p>
       <p><strong>${htmlEncode(matchDetails.matchName)}</strong> is available and interested in sharing this skill with you.</p>
       <p><a href="${htmlEncode(matchDetails.matchUrl)}">View Profile and Connect</a></p>
       <p>This is a great opportunity to start your learning journey. Don't miss it!</p>`,
    );
  }

  async sendRatePrompt(to: string, displayName: string, ratingUrl: string, partnerName: string, skillName: string): Promise<void> {
    await this.send(
      to,
      'How was your session? Share your feedback',
      `<h1>Rate Your Session</h1>
       <p>Hi ${htmlEncode(displayName)},</p>
       <p>Thank you for completing your session with ${htmlEncode(partnerName)} on <strong>${htmlEncode(skillName)}</strong>!</p>
       <p>We'd love to hear about your experience. Your rating helps build a better community and helps ${htmlEncode(partnerName)} improve their teaching.</p>
       <a href="${htmlEncode(ratingUrl)}">Rate This Session</a>
       <p>It takes less than a minute, and you can also leave a written review if you'd like.</p>`,
    );
  }

  async sendPointsLowWarning(to: string, displayName: string, currentBalance: number, recommendedAction: string): Promise<void> {
    await this.send(
      to,
      'Your 1hrLearning Points Balance is Running Low',
      `<h1>Points Balance Alert</h1>
       <p>Hi ${htmlEncode(displayName)},</p>
       <p>Your current points balance is <strong>${currentBalance} points</strong>, which is getting low.</p>
       <p>You need points to book learning sessions. Here's what we recommend:</p>
       <p>${htmlEncode(recommendedAction)}</p>
       <p>Remember, you earn points by teaching others! Consider adding more skills you could share.</p>
       <a href="${config.app.url}/dashboard">View Your Account</a>`,
    );
  }

  async sendPointsExpiryWarning(to: string, displayName: string, expiringPoints: number, expiryDate: Date): Promise<void> {
    await this.send(
      to,
      'Your 1hrLearning Points Will Expire Soon',
      `<h1>Points Expiry Notice</h1>
       <p>Hi ${htmlEncode(displayName)},</p>
       <p>You have <strong>${expiringPoints} points</strong> that will expire on <strong>${expiryDate.toLocaleDateString()}</strong>.</p>
       <p>Use them now to book a learning session before they're gone! Points expire after 6 months of inactivity.</p>
       <a href="${config.app.url}/discover">Find a Session</a>`,
    );
  }

  async sendFoundingSharerApproved(to: string, displayName: string, dashboardUrl: string): Promise<void> {
    await this.send(
      to,
      'Welcome to the 1hrLearning Founding Sharer Circle!',
      `<h1>Your Application Has Been Approved!</h1>
       <p>Hi ${htmlEncode(displayName)},</p>
       <p>Great news! You've been approved as a Founding Sharer on 1hrLearning.</p>
       <p>As a Founding Sharer, you get:</p>
       <ul>
         <li>Priority visibility in the matching algorithm</li>
         <li>Access to exclusive sharer resources</li>
         <li>Recognition in our community</li>
         <li>Direct support from the 1hrLearning team</li>
       </ul>
       <p>Your journey as a knowledge sharer starts now. Get ready to make an impact!</p>
       <a href="${htmlEncode(dashboardUrl)}">Go to Your Dashboard</a>`,
    );
  }

  async sendAccountSuspensionNotice(to: string, displayName: string, reason: string, appealUrl: string): Promise<void> {
    await this.send(
      to,
      'Your 1hrLearning Account Has Been Suspended',
      `<h1>Account Suspension Notice</h1>
       <p>Hi ${htmlEncode(displayName)},</p>
       <p>Your account has been temporarily suspended due to:</p>
       <p><strong>${htmlEncode(reason)}</strong></p>
       <p>This action is effective immediately. You will not be able to access your account or participate in sessions until the suspension is lifted.</p>
       <p>If you believe this suspension is a mistake, you can submit an appeal:</p>
       <a href="${htmlEncode(appealUrl)}">Appeal This Decision</a>
       <p>Our moderation team will review your appeal within 48 hours.</p>
       <p>If you have questions, you can reply to this email.</p>`,
    );
  }

  async sendReEngagementEmail(to: string, displayName: string, daysSinceActive: number, reengagementUrl: string): Promise<void> {
    await this.send(
      to,
      'We Miss You! Come Back to 1hrLearning',
      `<h1>We'd Love to See You Again!</h1>
       <p>Hi ${htmlEncode(displayName)},</p>
       <p>It's been ${daysSinceActive} days since you last visited 1hrLearning, and we miss you!</p>
       <p>Things have changed since you were here:</p>
       <ul>
         <li>New members are joining our community every day</li>
         <li>More skills are being shared than ever</li>
         <li>Your matches might be waiting for you</li>
       </ul>
       <p>Whether you're looking to learn or teach, there's never been a better time to reconnect.</p>
       <a href="${htmlEncode(reengagementUrl)}">Explore 1hrLearning</a>
       <p>We've made improvements to make matching even better. Come see what's new!</p>`,
    );
  }
}

export const emailService = new EmailService();
