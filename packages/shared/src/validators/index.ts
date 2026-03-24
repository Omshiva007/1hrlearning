import { z } from 'zod';
import { SKILL_CATEGORIES, PASSWORD, USERNAME, RATING, SESSION } from '../constants';

// ─── Auth ────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(USERNAME.MIN_LENGTH, `Username must be at least ${USERNAME.MIN_LENGTH} characters`)
    .max(USERNAME.MAX_LENGTH, `Username must be at most ${USERNAME.MAX_LENGTH} characters`)
    .regex(USERNAME.PATTERN, 'Username can only contain letters, numbers, underscores, and hyphens'),
  displayName: z.string().min(1, 'Display name is required').max(100),
  password: z
    .string()
    .min(PASSWORD.MIN_LENGTH, `Password must be at least ${PASSWORD.MIN_LENGTH} characters`)
    .max(PASSWORD.MAX_LENGTH),
  timezone: z.string().default('UTC'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(PASSWORD.MIN_LENGTH, `Password must be at least ${PASSWORD.MIN_LENGTH} characters`)
      .max(PASSWORD.MAX_LENGTH),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// ─── User ────────────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  timezone: z.string().optional(),
});

// ─── Skills ──────────────────────────────────────────────────────────────────

export const createSkillSchema = z.object({
  name: z.string().min(1, 'Skill name is required').max(100),
  description: z.string().max(500).nullable().optional(),
  category: z.enum([...SKILL_CATEGORIES] as [string, ...string[]]),
  subcategory: z.string().max(100).nullable().optional(),
});

export const addUserSkillSchema = z.object({
  skillId: z.string().cuid('Invalid skill ID'),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
  isTeaching: z.boolean(),
  isLearning: z.boolean(),
  description: z.string().max(300).nullable().optional(),
  yearsOfExperience: z.number().int().min(0).max(50).nullable().optional(),
});

export const updateUserSkillSchema = z.object({
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
  isTeaching: z.boolean().optional(),
  isLearning: z.boolean().optional(),
  description: z.string().max(300).nullable().optional(),
  yearsOfExperience: z.number().int().min(0).max(50).nullable().optional(),
});

export const skillQuerySchema = z.object({
  q: z.string().optional(),
  category: z.enum([...SKILL_CATEGORIES] as [string, ...string[]]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ─── Sessions ────────────────────────────────────────────────────────────────

export const createSessionSchema = z.object({
  learnerId: z.string().cuid('Invalid learner ID'),
  skillId: z.string().cuid('Invalid skill ID'),
  scheduledAt: z.string().datetime('Invalid date format'),
  durationMinutes: z
    .number()
    .int()
    .min(SESSION.MIN_DURATION_MINUTES)
    .max(SESSION.MAX_DURATION_MINUTES)
    .default(SESSION.DEFAULT_DURATION_MINUTES),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateSessionSchema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW']).optional(),
  scheduledAt: z.string().datetime().optional(),
  meetingUrl: z.string().url().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const rateSessionSchema = z.object({
  score: z.number().int().min(RATING.MIN).max(RATING.MAX),
  comment: z.string().max(500).nullable().optional(),
});

// ─── Connections ──────────────────────────────────────────────────────────────

export const createConnectionSchema = z.object({
  addresseeId: z.string().cuid('Invalid user ID'),
  message: z.string().max(300).nullable().optional(),
});

export const updateConnectionSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED', 'BLOCKED']),
});

// ─── Pagination ───────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateSkillInput = z.infer<typeof createSkillSchema>;
export type AddUserSkillInput = z.infer<typeof addUserSkillSchema>;
export type UpdateUserSkillInput = z.infer<typeof updateUserSkillSchema>;
export type SkillQueryInput = z.infer<typeof skillQuerySchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type RateSessionInput = z.infer<typeof rateSessionSchema>;
export type CreateConnectionInput = z.infer<typeof createConnectionSchema>;
export type UpdateConnectionInput = z.infer<typeof updateConnectionSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
