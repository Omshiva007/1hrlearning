import crypto from 'node:crypto';
import { prisma } from '../utils/prisma';
import { config } from '../config';
import { AppError } from '../types';
import { logger } from '../utils/logger';

export type EmailProvider = 'RESEND' | 'SENDGRID' | 'CONSOLE';

type SendMessage = { to: string; subject: string; html: string };

function encryptionKey(): Buffer {
  if (!config.email.credentialEncryptionKey) {
    throw new AppError('EMAIL_CREDENTIAL_ENCRYPTION_KEY must be configured before storing email credentials', 503);
  }
  return Buffer.from(config.email.credentialEncryptionKey, 'hex');
}

export function encryptEmailCredential(secret: string): string {
  // A unique IV and authenticated tag protect each stored API key against disclosure and tampering.
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptEmailCredential(payload: string): string {
  const [ivValue, tagValue, encryptedValue] = payload.split('.');
  if (!ivValue || !tagValue || !encryptedValue) throw new AppError('Stored email credential is invalid', 500);
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8');
}

export class EmailProviderService {
  async list() {
    const records = await prisma.emailProviderConfig.findMany({ orderBy: { provider: 'asc' } });
    return records.map(({ encryptedApiKey: _secret, ...record }) => ({
      ...record,
      isConfigured: record.provider === 'CONSOLE' || Boolean(record.credentialHint),
    }));
  }

  async configure(input: { provider: EmailProvider; fromEmail: string; fromName: string; apiKey?: string; activate: boolean; updatedById: string }) {
    const existing = await prisma.emailProviderConfig.findUnique({ where: { provider: input.provider } });
    const encryptedApiKey = input.apiKey ? encryptEmailCredential(input.apiKey) : existing?.encryptedApiKey;
    if (input.provider !== 'CONSOLE' && !encryptedApiKey) throw new AppError('An API key is required the first time this provider is configured', 400);

    return prisma.$transaction(async (db) => {
      if (input.activate) await db.emailProviderConfig.updateMany({ data: { isActive: false } });
      const record = await db.emailProviderConfig.upsert({
        where: { provider: input.provider },
        create: {
          provider: input.provider, fromEmail: input.fromEmail, fromName: input.fromName,
          encryptedApiKey: input.provider === 'CONSOLE' ? null : encryptedApiKey,
          credentialHint: input.apiKey ? input.apiKey.slice(-4) : null,
          isActive: input.activate, updatedById: input.updatedById,
        },
        update: {
          fromEmail: input.fromEmail, fromName: input.fromName,
          ...(input.apiKey ? { encryptedApiKey, credentialHint: input.apiKey.slice(-4) } : {}),
          ...(input.activate ? { isActive: true } : {}), updatedById: input.updatedById,
        },
      });
      const { encryptedApiKey: _secret, ...safe } = record;
      return { ...safe, isConfigured: record.provider === 'CONSOLE' || Boolean(record.credentialHint) };
    });
  }

  private async active(provider?: EmailProvider) {
    if (provider) return prisma.emailProviderConfig.findUnique({ where: { provider } });
    const stored = await prisma.emailProviderConfig.findFirst({ where: { isActive: true } });
    if (stored) return stored;

    // Existing installations remain compatible until an administrator saves the first provider configuration.
    if (config.email.sendgridApiKey) return {
      provider: 'SENDGRID', fromEmail: config.email.from, fromName: '1hrLearning',
      encryptedApiKey: null, credentialHint: config.email.sendgridApiKey.slice(-4), isActive: true,
      updatedById: null, createdAt: new Date(), updatedAt: new Date(),
    };
    return null;
  }

  async send(message: SendMessage, provider?: EmailProvider): Promise<{ provider: EmailProvider; id?: string }> {
    const selected = await this.active(provider);
    if (!selected) {
      // Missing configuration is a failed delivery, not a successful send that can advance reminder timestamps.
      throw new AppError('No active email provider is configured', 503);
    }
    const selectedProvider = selected.provider as EmailProvider;
    const from = `${selected.fromName} <${selected.fromEmail}>`;
    if (selectedProvider === 'CONSOLE') {
      logger.info(`[Email:CONSOLE] Would send to ${message.to}: ${message.subject}`);
      return { provider: 'CONSOLE' };
    }
    const apiKey = selected.encryptedApiKey ? decryptEmailCredential(selected.encryptedApiKey) : config.email.sendgridApiKey;
    if (!apiKey) throw new AppError(`${selectedProvider} credential is not configured`, 503);

    if (selectedProvider === 'RESEND') {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [message.to], subject: message.subject, html: message.html }),
      });
      const result = await response.json() as { id?: string; message?: string };
      if (!response.ok) throw new AppError(result.message ?? 'Resend rejected the email', 502);
      return { provider: 'RESEND', id: result.id };
    }

    // SendGrid's stable REST contract avoids coupling provider selection to a vendor SDK and its transitive risk surface.
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }] }],
        from: { email: selected.fromEmail, name: selected.fromName },
        subject: message.subject,
        content: [{ type: 'text/html', value: message.html }],
      }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({})) as { errors?: Array<{ message?: string }> };
      throw new AppError(result.errors?.[0]?.message ?? 'SendGrid rejected the email', 502);
    }
    return { provider: 'SENDGRID', id: response.headers.get('x-message-id') ?? undefined };
  }
}

export const emailProviderService = new EmailProviderService();
