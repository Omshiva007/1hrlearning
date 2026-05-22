export const USER_ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  MODERATOR: 'MODERATOR',
  SUPPORT: 'SUPPORT',
} as const;

export const SKILL_LEVELS = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
  EXPERT: 'EXPERT',
} as const;

export const SESSION_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
  RATED: 'RATED',
} as const;

export const AVAILABILITY_STATUS = {
  OPEN: 'OPEN',
  HELD: 'HELD',
  BOOKED: 'BOOKED',
} as const;

export const FLAG_STATUS = {
  OPEN: 'OPEN',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED',
} as const;

export const FLAG_TARGET_TYPE = {
  PROFILE: 'PROFILE',
  TESTIMONIAL: 'TESTIMONIAL',
  SESSION: 'SESSION',
} as const;

export const NOTIFICATION_TYPES = {
  SESSION_REQUEST: 'SESSION_REQUEST',
  SESSION_CONFIRMED: 'SESSION_CONFIRMED',
  SESSION_CANCELLED: 'SESSION_CANCELLED',
  SESSION_REMINDER: 'SESSION_REMINDER',
  SESSION_COMPLETED: 'SESSION_COMPLETED',
  RATING_RECEIVED: 'RATING_RECEIVED',
  POINTS_EARNED: 'POINTS_EARNED',
  SESSION_APPLIED: 'SESSION_APPLIED',
  SESSION_APPLICATION_ACCEPTED: 'SESSION_APPLICATION_ACCEPTED',
  SESSION_APPLICATION_REJECTED: 'SESSION_APPLICATION_REJECTED',
  SESSION_SKILL_MATCH: 'SESSION_SKILL_MATCH',
  INTEREST_RECEIVED: 'INTEREST_RECEIVED',
  INTEREST_APPROVED: 'INTEREST_APPROVED',
  INTEREST_DECLINED: 'INTEREST_DECLINED',
  BALANCE_LOW: 'BALANCE_LOW',
  PUBLIC_SESSION_AVAILABLE: 'PUBLIC_SESSION_AVAILABLE',
  POINTS_EXPIRY_WARNING: 'POINTS_EXPIRY_WARNING',
  TESTIMONIAL_RECEIVED: 'TESTIMONIAL_RECEIVED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  ACCOUNT_REINSTATED: 'ACCOUNT_REINSTATED',
  SYSTEM: 'SYSTEM',
} as const;

export const SESSION_APPLICATION_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
} as const;

export const POINT_TRANSACTION_TYPES = {
  EARNED_TEACHING: 'EARNED_TEACHING',
  SPENT_LEARNING: 'SPENT_LEARNING',
  BONUS: 'BONUS',
  PENALTY: 'PENALTY',
  REFUND: 'REFUND',
  ADMIN_GRANT: 'ADMIN_GRANT',
  ADMIN_DEDUCT: 'ADMIN_DEDUCT',
  EXPIRY: 'EXPIRY',
} as const;

// Points earned/spent scale with session duration (30 min = 5 pts base)
export const POINTS = {
  INITIAL_BALANCE: 10,
  REGISTRATION_BONUS: 10,
  PER_30_MIN: 5,
  // Derived: multiply by (durationMinutes / 30)
  MAX_BALANCE: 200,
  MIN_BALANCE_TO_BOOK: 5,
  EXPIRY_MONTHS: 6,
  MAX_SESSIONS_PER_WEEK: 3,
  BALANCE_LOW_THRESHOLD: 9,
  // Rating bonuses (earned by sharer when learner rates)
  RATING_BONUS_5_STAR: 5,
  RATING_BONUS_4_STAR: 3,
  RATING_BONUS_3_STAR: 1,
  // No-show penalty for sharer
  NO_SHOW_SHARER_PENALTY: 5,
  // Deprecated flat constants kept for backward compat
  PER_SESSION_TAUGHT: 5,
  PER_SESSION_LEARNED: 5,
  REFERRAL_BONUS: 5,
} as const;

export const SESSION = {
  DEFAULT_DURATION_MINUTES: 60,
  MIN_DURATION_MINUTES: 30,
  MAX_DURATION_MINUTES: 120,
  DURATION_STEP: 30,
  REMINDER_MINUTES_BEFORE: 30,
  AUTO_COMPLETE_HOURS_AFTER: 24,
  JOIN_BUTTON_MINUTES_BEFORE: 30,
} as const;

export const FITMENT = {
  TOPIC_EXACT_MATCH: 50,
  TOPIC_RELATED_MATCH: 25,
  AVAILABILITY_FULL_OVERLAP: 30,
  AVAILABILITY_PARTIAL_OVERLAP: 15,
  REPUTATION_MAX: 20,
  MIN_SCORE_TO_SHOW: 40,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const SKILL_CATEGORIES = [
  'Technology',
  'Design',
  'Business',
  'Language',
  'Music',
  'Art',
  'Science',
  'Mathematics',
  'Writing',
  'Cooking',
  'Fitness',
  'Mindfulness',
  'Photography',
  'Finance',
  'Career',
  'Other',
] as const;

// Seed of related-category pairs for partial topic match scoring
export const RELATED_CATEGORIES: Array<[string, string]> = [
  ['Technology', 'Science'],
  ['Technology', 'Mathematics'],
  ['Business', 'Finance'],
  ['Business', 'Career'],
  ['Writing', 'Language'],
  ['Art', 'Design'],
  ['Art', 'Photography'],
  ['Fitness', 'Mindfulness'],
];

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const RATING = {
  MIN: 1,
  MAX: 5,
} as const;

export const PASSWORD = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 100,
  SALT_ROUNDS: 12,
} as const;

export const USERNAME = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 30,
  PATTERN: /^[a-zA-Z0-9_-]+$/,
} as const;

export const CACHE_TTL = {
  USER_PROFILE: 300,
  SKILL_LIST: 600,
  LEADERBOARD: 60,
  SESSION_LIST: 120,
  ADMIN_DASHBOARD: 300,
} as const;

// Admin configurable point rule keys (stored in PointConfig table)
export const POINT_CONFIG_KEYS = {
  SIGNUP_BONUS: 'signup_bonus',
  PER_30_MIN: 'per_30_min',
  RATING_BONUS_5_STAR: 'rating_bonus_5_star',
  RATING_BONUS_4_STAR: 'rating_bonus_4_star',
  RATING_BONUS_3_STAR: 'rating_bonus_3_star',
  NO_SHOW_SHARER_PENALTY: 'no_show_sharer_penalty',
  MAX_BALANCE: 'max_balance',
  EXPIRY_MONTHS: 'expiry_months',
  MAX_SESSIONS_PER_WEEK: 'max_sessions_per_week',
  MIN_FITMENT_SCORE: 'min_fitment_score',
} as const;

// Platform config keys (stored in PlatformConfig table)
export const PLATFORM_CONFIG_KEYS = {
  MAINTENANCE_MODE: 'maintenance_mode',
  NEW_REGISTRATIONS: 'new_registrations',
  SHARER_ONBOARDING: 'sharer_onboarding',
  POINT_ECONOMY_ACTIVE: 'point_economy_active',
  MATCHING_ENGINE_ACTIVE: 'matching_engine_active',
  PUBLIC_SESSIONS_ENABLED: 'public_sessions_enabled',
  TESTIMONIALS_ENABLED: 'testimonials_enabled',
  MIN_PROFILE_COMPLETENESS: 'min_profile_completeness',
  SESSION_AUTO_COMPLETE_DELAY: 'session_auto_complete_delay',
  SUPPORT_EMAIL: 'support_email',
} as const;
