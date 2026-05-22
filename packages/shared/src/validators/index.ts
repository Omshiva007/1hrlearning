import { z } from 'zod';
import { SKILL_CATEGORIES, PASSWORD, USERNAME, RATING, SESSION, POINT_CONFIG_KEYS, PLATFORM_CONFIG_KEYS } from '../constants';

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

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(PASSWORD.MIN_LENGTH, `Password must be at least ${PASSWORD.MIN_LENGTH} characters`)
    .max(PASSWORD.MAX_LENGTH),
});

// ─── User ────────────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  timezone: z.string().optional(),
  isDiscoverable: z.boolean().optional(),
  reciprocalVisibility: z.boolean().optional(),
  adEmailOptOut: z.boolean().optional(),
  defaultMeetingProvider: z.enum(['ZOOM', 'GOOGLE_MEET', 'CUSTOM']).nullable().optional(),
  defaultMeetingUrl: z.string().url().nullable().optional(),
  defaultSessionDuration: z.number().int().refine(
    (v) => [30, 60, 90, 120].includes(v),
    'Duration must be 30, 60, 90, or 120 minutes',
  ).optional(),
  notificationPreferences: z.record(z.boolean()).optional(),
});

export const onboardingProfileSchema = z.object({
  displayName: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
  timezone: z.string().default('UTC'),
  avatarUrl: z.string().url().nullable().optional(),
});

// ─── Skills ──────────────────────────────────────────────────────────────────

export const createSkillSchema = z.object({
  name: z.string().min(1, 'Skill name is required').max(100),
  description: z.string().max(500).nullable().optional(),
  category: z.enum([...SKILL_CATEGORIES] as [string, ...string[]]),
  subcategory: z.string().max(100).nullable().optional(),
  iconUrl: z.string().url().nullable().optional(),
  isApproved: z.boolean().optional(),
});

export const updateSkillSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  category: z.enum([...SKILL_CATEGORIES] as [string, ...string[]]).optional(),
  subcategory: z.string().max(100).nullable().optional(),
  iconUrl: z.string().url().nullable().optional(),
  isApproved: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isDeprecated: z.boolean().optional(),
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

// ─── Availability ─────────────────────────────────────────────────────────────

export const createAvailabilitySchema = z.object({
  startTime: z.string().datetime('Invalid start time'),
  endTime: z.string().datetime('Invalid end time'),
}).refine((d) => new Date(d.endTime) > new Date(d.startTime), {
  message: 'End time must be after start time',
  path: ['endTime'],
});

export const updateAvailabilitySchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  status: z.enum(['OPEN', 'HELD', 'BOOKED']).optional(),
});

// ─── Meeting Links ────────────────────────────────────────────────────────────

export const createMeetingLinkSchema = z.object({
  label: z.string().min(1).max(100),
  url: z.string().url('Invalid meeting URL'),
  provider: z.enum(['ZOOM', 'GOOGLE_MEET', 'CUSTOM']).default('CUSTOM'),
});

// ─── Sessions ────────────────────────────────────────────────────────────────

const VALID_DURATIONS = [30, 60, 90, 120] as const;

export const createSessionSchema = z.object({
  learnerId: z.string().cuid('Invalid learner ID').optional(),
  skillId: z.string().cuid('Invalid skill ID'),
  scheduledAt: z.string().datetime('Invalid date format'),
  durationMinutes: z
    .number()
    .int()
    .refine((v) => VALID_DURATIONS.includes(v as typeof VALID_DURATIONS[number]), {
      message: `Duration must be one of: ${VALID_DURATIONS.join(', ')} minutes`,
    })
    .default(SESSION.DEFAULT_DURATION_MINUTES),
  notes: z.string().max(1000).nullable().optional(),
  isPublic: z.boolean().default(false),
  applicationDeadline: z.string().datetime().nullable().optional(),
  maxLearners: z.number().int().min(1).max(10).default(1),
  meetingUrl: z.string().url().nullable().optional(),
  meetingLinkId: z.string().cuid().nullable().optional(),
  availabilityId: z.string().cuid().nullable().optional(),
  depthLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
  agenda: z.string().max(1000).nullable().optional(),
});

export const sendInterestSchema = z.object({
  skillId: z.string().cuid('Invalid skill ID'),
  sharerId: z.string().cuid('Invalid sharer ID'),
  availabilityId: z.string().cuid('Invalid availability slot ID'),
  depthLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
  message: z.string().max(500).nullable().optional(),
});

export const sendSessionRequestSchema = z.object({
  skillId: z.string().cuid('Invalid skill ID'),
  sharerId: z.string().cuid('Invalid sharer ID'),
  availabilityId: z.string().cuid('Invalid availability slot ID'),
  durationMinutes: z
    .number()
    .int()
    .refine((v) => VALID_DURATIONS.includes(v as typeof VALID_DURATIONS[number]))
    .default(60),
  depthLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
  agenda: z.string().min(1, 'Agenda is required').max(1000),
});

export const updateSessionSchema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'RATED']).optional(),
  scheduledAt: z.string().datetime().optional(),
  meetingUrl: z.string().url().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  cancelReason: z.string().max(500).nullable().optional(),
});

export const rateSessionSchema = z.object({
  score: z.number().int().min(RATING.MIN).max(RATING.MAX),
  comment: z.string().max(500).nullable().optional(),
});

export const createTestimonialSchema = z.object({
  content: z.string().min(10, 'Testimonial must be at least 10 characters').max(1000),
});

// ─── Flagging ─────────────────────────────────────────────────────────────────

export const createFlagSchema = z.object({
  targetType: z.enum(['PROFILE', 'TESTIMONIAL', 'SESSION']),
  targetId: z.string().min(1),
  reason: z.string().min(10, 'Please provide a reason (min 10 characters)').max(500),
});

export const resolveFlagSchema = z.object({
  status: z.enum(['RESOLVED', 'DISMISSED']),
  resolutionNote: z.string().max(500).nullable().optional(),
});

// ─── Session Applications ─────────────────────────────────────────────────────

export const applyToSessionSchema = z.object({
  message: z.string().max(500).nullable().optional(),
  depthLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
});

export const updateSessionApplicationSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']),
});

export const discoverSessionsSchema = z.object({
  skillId: z.string().cuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ─── Admin — User Actions ─────────────────────────────────────────────────────

export const adminSuspendUserSchema = z.object({
  reason: z.string().min(5, 'Reason is required (min 5 characters)').max(500),
});

export const adminBanUserSchema = z.object({
  reason: z.string().min(5, 'Reason is required (min 5 characters)').max(500),
});

export const adminPointAdjustSchema = z.object({
  action: z.enum(['GRANT', 'DEDUCT', 'RESET']),
  amount: z.number().int().min(1).max(500),
  reason: z.string().min(5, 'Reason is required').max(500),
  notifyUser: z.boolean().default(false),
});

// ─── Admin — Point Config ─────────────────────────────────────────────────────

export const updatePointConfigSchema = z.object({
  key: z.enum(Object.values(POINT_CONFIG_KEYS) as [string, ...string[]]),
  value: z.number().int().min(0),
  reason: z.string().min(5).max(500),
});

// ─── Admin — Platform Config ──────────────────────────────────────────────────

export const updatePlatformConfigSchema = z.object({
  key: z.enum(Object.values(PLATFORM_CONFIG_KEYS) as [string, ...string[]]),
  value: z.string().min(1),
  reason: z.string().min(5).max(500),
});

// ─── Admin — Ads ──────────────────────────────────────────────────────────────

export const createAdSchema = z.object({
  advertiserName: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(500),
  targetUrl: z.string().url(),
  topicCategories: z.array(z.enum([...SKILL_CATEGORIES] as [string, ...string[]])).min(1),
  placement: z.enum(['EMAIL', 'TOPIC_PAGE', 'DASHBOARD', 'ALL']).default('ALL'),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
});

export const updateAdSchema = createAdSchema.partial().extend({
  status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']).optional(),
});

// ─── Admin — Session Override ─────────────────────────────────────────────────

export const adminSessionOverrideSchema = z.object({
  action: z.enum([
    'OVERRIDE_NO_SHOW_LEARNER',
    'OVERRIDE_NO_SHOW_SHARER',
    'REVERSE_POINTS',
    'MANUALLY_COMPLETE',
    'CANCEL',
  ]),
  reason: z.string().min(5).max(500),
});

// ─── Pagination ───────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const adPreferenceSchema = z.object({
  adEmailOptOut: z.boolean(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type OnboardingProfileInput = z.infer<typeof onboardingProfileSchema>;
export type CreateSkillInput = z.infer<typeof createSkillSchema>;
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>;
export type AddUserSkillInput = z.infer<typeof addUserSkillSchema>;
export type UpdateUserSkillInput = z.infer<typeof updateUserSkillSchema>;
export type SkillQueryInput = z.infer<typeof skillQuerySchema>;
export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>;
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
export type CreateMeetingLinkInput = z.infer<typeof createMeetingLinkSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type SendInterestInput = z.infer<typeof sendInterestSchema>;
export type SendSessionRequestInput = z.infer<typeof sendSessionRequestSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type RateSessionInput = z.infer<typeof rateSessionSchema>;
export type CreateTestimonialInput = z.infer<typeof createTestimonialSchema>;
export type CreateFlagInput = z.infer<typeof createFlagSchema>;
export type ResolveFlagInput = z.infer<typeof resolveFlagSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type ApplyToSessionInput = z.infer<typeof applyToSessionSchema>;
export type UpdateSessionApplicationInput = z.infer<typeof updateSessionApplicationSchema>;
export type DiscoverSessionsInput = z.infer<typeof discoverSessionsSchema>;
export type AdPreferenceInput = z.infer<typeof adPreferenceSchema>;
export type AdminSuspendUserInput = z.infer<typeof adminSuspendUserSchema>;
export type AdminBanUserInput = z.infer<typeof adminBanUserSchema>;
export type AdminPointAdjustInput = z.infer<typeof adminPointAdjustSchema>;
export type UpdatePointConfigInput = z.infer<typeof updatePointConfigSchema>;
export type UpdatePlatformConfigInput = z.infer<typeof updatePlatformConfigSchema>;
export type CreateAdInput = z.infer<typeof createAdSchema>;
export type UpdateAdInput = z.infer<typeof updateAdSchema>;
export type AdminSessionOverrideInput = z.infer<typeof adminSessionOverrideSchema>;
