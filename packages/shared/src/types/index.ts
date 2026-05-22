export type UserRole = 'USER' | 'ADMIN' | 'MODERATOR' | 'SUPPORT';
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
export type SessionStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RATED';
export type SessionApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type AvailabilityStatus = 'OPEN' | 'HELD' | 'BOOKED';
export type FlagTargetType = 'PROFILE' | 'TESTIMONIAL' | 'SESSION';
export type FlagStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';
export type AdStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type AdPlacement = 'EMAIL' | 'TOPIC_PAGE' | 'DASHBOARD' | 'ALL';
export type MeetingProvider = 'ZOOM' | 'GOOGLE_MEET' | 'CUSTOM';

export type NotificationType =
  | 'SESSION_REQUEST'
  | 'SESSION_CONFIRMED'
  | 'SESSION_CANCELLED'
  | 'SESSION_REMINDER'
  | 'SESSION_COMPLETED'
  | 'RATING_RECEIVED'
  | 'POINTS_EARNED'
  | 'SESSION_APPLIED'
  | 'SESSION_APPLICATION_ACCEPTED'
  | 'SESSION_APPLICATION_REJECTED'
  | 'SESSION_SKILL_MATCH'
  | 'INTEREST_RECEIVED'
  | 'INTEREST_APPROVED'
  | 'INTEREST_DECLINED'
  | 'BALANCE_LOW'
  | 'PUBLIC_SESSION_AVAILABLE'
  | 'POINTS_EXPIRY_WARNING'
  | 'TESTIMONIAL_RECEIVED'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_REINSTATED'
  | 'SYSTEM';

export type PointTransactionType =
  | 'EARNED_TEACHING'
  | 'SPENT_LEARNING'
  | 'BONUS'
  | 'PENALTY'
  | 'REFUND'
  | 'ADMIN_GRANT'
  | 'ADMIN_DEDUCT'
  | 'EXPIRY';

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  timezone: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  isSuspended: boolean;
  isBanned: boolean;
  isOnboardingComplete: boolean;
  isDiscoverable: boolean;
  reciprocalVisibility: boolean;
  adEmailOptOut: boolean;
  notificationPreferences: Record<string, boolean> | null;
  defaultMeetingProvider?: MeetingProvider | null;
  defaultMeetingUrl?: string | null;
  defaultSessionDuration: number;
  pointsBalance: number;
  pointsLocked: number;
  totalSessionsTaught: number;
  totalSessionsLearned: number;
  averageRating: number | null;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  timezone: string;
  isVerified: boolean;
  isDiscoverable: boolean;
  defaultSessionDuration: number;
  totalSessionsTaught: number;
  totalSessionsLearned: number;
  averageRating: number | null;
  ratingCount: number;
  createdAt: Date;
  teachingSkills: UserSkill[];
  learningSkills: UserSkill[];
}

// ─── Skills ───────────────────────────────────────────────────────────────────

export interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  iconUrl: string | null;
  userCount: number;
  sessionCount: number;
  isApproved: boolean;
  isFeatured: boolean;
  isDeprecated: boolean;
  createdAt: Date;
}

export interface UserSkill {
  id: string;
  userId: string;
  skillId: string;
  skill: Skill;
  level: SkillLevel;
  isTeaching: boolean;
  isLearning: boolean;
  description: string | null;
  yearsOfExperience: number | null;
  endorsementCount: number;
}

// ─── Availability ─────────────────────────────────────────────────────────────

export interface Availability {
  id: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  status: AvailabilityStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Meeting Links ────────────────────────────────────────────────────────────

export interface SavedMeetingLink {
  id: string;
  userId: string;
  label: string;
  url: string;
  provider: MeetingProvider;
  createdAt: Date;
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export interface Session {
  id: string;
  teacherId: string;
  learnerId: string | null;
  skillId: string;
  skill: Skill;
  status: SessionStatus;
  isPublic: boolean;
  depthLevel: SkillLevel | null;
  agenda: string | null;
  applicationDeadline: Date | null;
  maxLearners: number;
  scheduledAt: Date;
  durationMinutes: number;
  meetingUrl: string | null;
  notes: string | null;
  pointsPerSession: number;
  pointsLocked: boolean;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionApplication {
  id: string;
  sessionId: string;
  applicantId: string;
  applicant?: PublicUser;
  status: SessionApplicationStatus;
  message: string | null;
  depthLevel: SkillLevel | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Ratings & Testimonials ───────────────────────────────────────────────────

export interface Rating {
  id: string;
  sessionId: string;
  raterId: string;
  ratedUserId: string;
  score: number;
  comment: string | null;
  createdAt: Date;
}

export interface Testimonial {
  id: string;
  sessionId: string;
  authorId: string;
  author?: Pick<PublicUser, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
  recipientId: string;
  content: string;
  isApproved: boolean;
  isFlagged: boolean;
  createdAt: Date;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: Date;
}

// ─── Points ───────────────────────────────────────────────────────────────────

export interface PointTransaction {
  id: string;
  userId: string;
  type: PointTransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  sessionId: string | null;
  adminNote: string | null;
  createdAt: Date;
}

// ─── Moderation ───────────────────────────────────────────────────────────────

export interface Flag {
  id: string;
  reporterId: string;
  targetType: FlagTargetType;
  targetId: string;
  reason: string;
  status: FlagStatus;
  resolvedById: string | null;
  resolutionNote: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  adminId: string;
  actionType: string;
  targetType: string;
  targetId: string;
  beforeValue: Record<string, unknown> | null;
  afterValue: Record<string, unknown> | null;
  reason: string | null;
  ipAddress: string | null;
  createdAt: Date;
}

export interface PointConfig {
  id: string;
  key: string;
  value: number;
  description: string;
  updatedById: string | null;
  updatedAt: Date;
}

export interface PlatformConfig {
  id: string;
  key: string;
  value: string;
  description: string;
  updatedById: string | null;
  updatedAt: Date;
}

export interface Ad {
  id: string;
  advertiserName: string;
  title: string;
  body: string;
  targetUrl: string;
  topicCategories: string[];
  placement: AdPlacement;
  status: AdStatus;
  impressions: number;
  clicks: number;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
}

// ─── Matching ─────────────────────────────────────────────────────────────────

export interface FitmentScoreFactors {
  topicMatch: number;        // 0-50
  availabilityOverlap: number; // 0-30
  reputation: number;        // 0-20
  total: number;             // 0-100
}

export interface MatchScore {
  userId: string;
  user: PublicUser;
  fitmentScore: number;
  scoreFactors: FitmentScoreFactors;
  canTeachMe: Skill[];
  iCanTeach: Skill[];
  matchedSkills: Skill[];
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}
