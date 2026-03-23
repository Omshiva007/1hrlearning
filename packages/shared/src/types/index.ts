export type UserRole = 'USER' | 'ADMIN' | 'MODERATOR';
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
export type SessionStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type ConnectionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
export type NotificationType =
  | 'CONNECTION_REQUEST'
  | 'CONNECTION_ACCEPTED'
  | 'SESSION_REQUEST'
  | 'SESSION_CONFIRMED'
  | 'SESSION_CANCELLED'
  | 'SESSION_REMINDER'
  | 'SESSION_COMPLETED'
  | 'RATING_RECEIVED'
  | 'POINTS_EARNED'
  | 'SYSTEM';
export type PointTransactionType = 'EARNED_TEACHING' | 'SPENT_LEARNING' | 'BONUS' | 'PENALTY' | 'REFUND';

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
  pointsBalance: number;
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
  pointsBalance: number;
  totalSessionsTaught: number;
  totalSessionsLearned: number;
  averageRating: number | null;
  ratingCount: number;
  createdAt: Date;
  teachingSkills: UserSkill[];
  learningSkills: UserSkill[];
}

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

export interface Session {
  id: string;
  teacherId: string;
  learnerId: string;
  skillId: string;
  skill: Skill;
  status: SessionStatus;
  scheduledAt: Date;
  durationMinutes: number;
  meetingUrl: string | null;
  notes: string | null;
  teacherRating: Rating | null;
  learnerRating: Rating | null;
  pointsTransferred: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Rating {
  id: string;
  sessionId: string;
  raterId: string;
  ratedUserId: string;
  score: number;
  comment: string | null;
  createdAt: Date;
}

export interface Connection {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: ConnectionStatus;
  message: string | null;
  createdAt: Date;
  updatedAt: Date;
}

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

export interface PointTransaction {
  id: string;
  userId: string;
  type: PointTransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  sessionId: string | null;
  createdAt: Date;
}

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

export interface MatchScore {
  userId: string;
  user: PublicUser;
  score: number;
  matchedSkills: Skill[];
}
