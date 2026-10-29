import { z } from 'zod/v3';

// Validate environment input once at startup so downstream modules consume a stable typed configuration.

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  SENDGRID_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@1hrlearning.com'),
  EMAIL_CREDENTIAL_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/, 'Must be a 64-character hex key').optional(),
  SENTRY_DSN: z.string().optional(),
  APP_URL: z.string().url().default('http://localhost:3000'),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  env: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  db: {
    url: parsed.data.DATABASE_URL,
  },
  redis: {
    url: parsed.data.REDIS_URL,
  },
  jwt: {
    secret: parsed.data.JWT_SECRET,
    refreshSecret: parsed.data.JWT_REFRESH_SECRET,
    expiresIn: parsed.data.JWT_EXPIRES_IN,
    refreshExpiresIn: parsed.data.JWT_REFRESH_EXPIRES_IN,
  },
  cors: {
    origins: parsed.data.CORS_ORIGINS.split(',').map((o) => o.trim()),
  },
  email: {
    sendgridApiKey: parsed.data.SENDGRID_API_KEY,
    from: parsed.data.EMAIL_FROM,
    credentialEncryptionKey: parsed.data.EMAIL_CREDENTIAL_ENCRYPTION_KEY,
  },
  sentry: {
    dsn: parsed.data.SENTRY_DSN,
  },
  app: {
    url: parsed.data.APP_URL,
  },
  isProd: parsed.data.NODE_ENV === 'production',
  isDev: parsed.data.NODE_ENV === 'development',
} as const;
