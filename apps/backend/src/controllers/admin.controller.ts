import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../types';
import { redis, cacheGet, cacheSet, cacheDel } from '../utils/redis';
import { SKILL_CATEGORIES, POINTS, POINT_CONFIG_KEYS, PLATFORM_CONFIG_KEYS } from '@1hrlearning/shared';
import { pointsService } from '../services/points.service';
import { notificationService } from '../services/notification.service';
import { emailService } from '../services/email.service';

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

async function invalidateSkillsCaches(...extraKeys: string[]): Promise<void> {
  const keys: string[] = [...extraKeys, 'admin:dashboard'];
  let cursor = '0';
  do {
    const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', 'skills:list:*', 'COUNT', 100);
    cursor = nextCursor;
    keys.push(...batch);
  } while (cursor !== '0');
  if (keys.length > 0) await cacheDel(...keys);
}

async function writeAuditLog(
  adminId: string,
  actionType: string,
  targetType: string,
  targetId: string,
  reason: string | null,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
  ip?: string,
) {
  await prisma.auditLog.create({
    data: {
      adminId,
      actionType,
      targetType,
      targetId,
      beforeValue: before ?? null,
      afterValue: after ?? null,
      reason,
      ipAddress: ip ?? null,
    },
  });
}

export const adminController = {
  // ── Dashboard ─────────────────────────────────────────────────────────────

  async getDashboard(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cacheKey = 'admin:dashboard';
      const cached = await cacheGet(cacheKey);
      if (cached) { res.json({ success: true, data: cached }); return; }

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const today = new Date(); today.setHours(0, 0, 0, 0);

      const [
        totalUsers,
        activeUsers7d,
        totalSessionsCompleted,
        sessionsToday,
        openFlags,
        onboardingIncomplete,
        pointsInCirculation,
        noShowSessions,
        totalConfirmed,
      ] = await Promise.all([
        prisma.user.count({ where: { isActive: true, isBanned: false } }),
        prisma.user.count({ where: { isActive: true, lastActiveAt: { gte: sevenDaysAgo } } }),
        prisma.session.count({ where: { status: { in: ['COMPLETED', 'RATED'] } } }),
        prisma.session.count({ where: { status: { in: ['COMPLETED', 'RATED'] }, completedAt: { gte: today } } }),
        prisma.flag.count({ where: { status: 'OPEN' } }),
        prisma.user.count({ where: { isOnboardingComplete: false, isActive: true } }),
        prisma.user.aggregate({ _sum: { pointsBalance: true } }),
        prisma.session.count({ where: { status: 'NO_SHOW' } }),
        prisma.session.count({ where: { status: { in: ['CONFIRMED', 'COMPLETED', 'RATED', 'NO_SHOW'] } } }),
      ]);

      // Topic supply vs demand snapshot
      const topLearnerTopics = await prisma.userSkill.groupBy({
        by: ['skillId'],
        where: { isLearning: true },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 5,
      });
      const topSharerTopics = await prisma.userSkill.groupBy({
        by: ['skillId'],
        where: { isTeaching: true },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 5,
      });

      const data = {
        healthMetrics: {
          totalUsers,
          activeUsers7d,
          activeRate7d: totalUsers > 0 ? Math.round((activeUsers7d / totalUsers) * 100) : 0,
          totalSessionsCompleted,
          sessionsToday,
          noShowRate: totalConfirmed > 0 ? Math.round((noShowSessions / totalConfirmed) * 100) : 0,
          onboardingDropOff: totalUsers > 0 ? Math.round((onboardingIncomplete / totalUsers) * 100) : 0,
          pointsInCirculation: pointsInCirculation._sum.pointsBalance ?? 0,
          openFlags,
        },
        topLearnerTopics,
        topSharerTopics,
      };

      await cacheSet(cacheKey, data, 300);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  },

  // ── Skills ─────────────────────────────────────────────────────────────────

  async listSkills(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q, category, page = '1', limit = '20' } = req.query as Record<string, string>;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const where = {
        ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
        ...(category ? { category } : {}),
      };

      const [skills, total] = await Promise.all([
        prisma.skill.findMany({ where, skip, take: limitNum, orderBy: { createdAt: 'desc' } }),
        prisma.skill.count({ where }),
      ]);

      res.json({
        success: true, data: skills,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum), hasNext: skip + skills.length < total, hasPrev: pageNum > 1 },
      });
    } catch (error) { next(error); }
  },

  async createSkill(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, description, category, subcategory, iconUrl, isApproved = true } = req.body;
      if (!name || !category) throw new AppError('Name and category are required', 400);

      const slug = slugify(name);
      const existing = await prisma.skill.findFirst({
        where: { OR: [{ name: { equals: name, mode: 'insensitive' } }, { slug }] },
      });
      if (existing) throw new AppError('Skill already exists', 409);

      const skill = await prisma.skill.create({
        data: { name, slug, description: description ?? null, category, subcategory: subcategory ?? null, iconUrl: iconUrl ?? null, isApproved: Boolean(isApproved) },
      });

      await invalidateSkillsCaches();
      res.status(201).json({ success: true, data: skill });
    } catch (error) { next(error); }
  },

  async updateSkill(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const existing = await prisma.skill.findUnique({ where: { id } });
      if (!existing) throw new AppError('Skill not found', 404);

      const updateData: Record<string, unknown> = {};
      const { name, description, category, subcategory, iconUrl, isApproved, isFeatured, isDeprecated } = req.body;
      if (name !== undefined) { updateData.name = name; updateData.slug = slugify(name); }
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.category = category;
      if (subcategory !== undefined) updateData.subcategory = subcategory;
      if (iconUrl !== undefined) updateData.iconUrl = iconUrl;
      if (isApproved !== undefined) updateData.isApproved = Boolean(isApproved);
      if (isFeatured !== undefined) updateData.isFeatured = Boolean(isFeatured);
      if (isDeprecated !== undefined) updateData.isDeprecated = Boolean(isDeprecated);

      const skill = await prisma.skill.update({ where: { id }, data: updateData });
      await invalidateSkillsCaches(`skill:${id}`);
      res.json({ success: true, data: skill });
    } catch (error) { next(error); }
  },

  async deleteSkill(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const existing = await prisma.skill.findUnique({ where: { id } });
      if (!existing) throw new AppError('Skill not found', 404);
      await prisma.skill.delete({ where: { id } });
      await invalidateSkillsCaches(`skill:${id}`);
      res.json({ success: true, message: 'Skill deleted' });
    } catch (error) { next(error); }
  },

  async listCategories(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const [categoryCounts, learnerCounts, sharerCounts] = await Promise.all([
        prisma.skill.groupBy({ by: ['category'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
        prisma.userSkill.groupBy({ by: ['skillId'], where: { isLearning: true }, _count: { userId: true } }),
        prisma.userSkill.groupBy({ by: ['skillId'], where: { isTeaching: true }, _count: { userId: true } }),
      ]);

      const skillCategories = await prisma.skill.findMany({ select: { id: true, category: true } });
      const skillCatMap = new Map(skillCategories.map((s) => [s.id, s.category]));

      const learnerByCategory = new Map<string, number>();
      const sharerByCategory = new Map<string, number>();

      for (const l of learnerCounts) {
        const cat = skillCatMap.get(l.skillId);
        if (cat) learnerByCategory.set(cat, (learnerByCategory.get(cat) ?? 0) + l._count.userId);
      }
      for (const s of sharerCounts) {
        const cat = skillCatMap.get(s.skillId);
        if (cat) sharerByCategory.set(cat, (sharerByCategory.get(cat) ?? 0) + s._count.userId);
      }

      const countMap = new Map(categoryCounts.map((c: { category: string; _count: { id: number } }) => [c.category, c._count.id]));

      const categories = SKILL_CATEGORIES.map((cat: string) => ({
        name: cat,
        skillCount: countMap.get(cat) ?? 0,
        learnerDemand: learnerByCategory.get(cat) ?? 0,
        sharerSupply: sharerByCategory.get(cat) ?? 0,
        demandToSupplyRatio: (sharerByCategory.get(cat) ?? 0) > 0
          ? Math.round(((learnerByCategory.get(cat) ?? 0) / (sharerByCategory.get(cat) ?? 1)) * 10) / 10
          : null,
      }));

      res.json({ success: true, data: categories });
    } catch (error) { next(error); }
  },

  // ── Users ──────────────────────────────────────────────────────────────────

  async listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q, role, status, page = '1', limit = '20' } = req.query as Record<string, string>;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const where: Record<string, unknown> = {
        ...(q ? { OR: [{ username: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { displayName: { contains: q, mode: 'insensitive' } }] } : {}),
        ...(role ? { role } : {}),
        ...(status === 'suspended' ? { isSuspended: true } : status === 'banned' ? { isBanned: true } : status === 'inactive' ? { isActive: false } : {}),
      };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, email: true, username: true, displayName: true, role: true,
            isActive: true, isVerified: true, isSuspended: true, isBanned: true,
            isOnboardingComplete: true, pointsBalance: true,
            totalSessionsTaught: true, totalSessionsLearned: true, createdAt: true,
            _count: { select: { skills: true } },
          },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        success: true, data: users,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum), hasNext: skip + users.length < total, hasPrev: pageNum > 1 },
      });
    } catch (error) { next(error); }
  },

  async getUserById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true, email: true, username: true, displayName: true, bio: true, avatarUrl: true, timezone: true,
          role: true, isActive: true, isVerified: true, isSuspended: true, isBanned: true,
          suspendedReason: true, bannedReason: true, suspendedAt: true, bannedAt: true,
          isOnboardingComplete: true, pointsBalance: true, pointsLocked: true,
          totalSessionsTaught: true, totalSessionsLearned: true, averageRating: true, ratingCount: true, createdAt: true, lastActiveAt: true,
          skills: { include: { skill: true }, orderBy: { createdAt: 'desc' } },
          sessionsTeaching: { take: 10, orderBy: { createdAt: 'desc' }, include: { skill: true } },
          sessionsLearning: { take: 10, orderBy: { createdAt: 'desc' }, include: { skill: true } },
          ratingsReceived: { take: 10, orderBy: { createdAt: 'desc' } },
          testimonialsReceived: { take: 5, orderBy: { createdAt: 'desc' }, include: { author: { select: { displayName: true, username: true } } } },
          flagsReported: { take: 5, orderBy: { createdAt: 'desc' } },
          auditLogs: { take: 10, orderBy: { createdAt: 'desc' } },
          _count: { select: { sessionsTeaching: true, sessionsLearning: true, ratingsReceived: true } },
        },
      });
      if (!user) throw new AppError('User not found', 404);
      res.json({ success: true, data: user });
    } catch (error) { next(error); }
  },

  async suspendUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body as { reason: string };
      if (req.user.id === id) throw new AppError('Cannot suspend yourself', 400);

      const target = await prisma.user.findUnique({ where: { id }, select: { isSuspended: true, role: true, displayName: true, email: true } });
      if (!target) throw new AppError('User not found', 404);
      if (target.isSuspended) throw new AppError('User is already suspended', 400);

      await prisma.user.update({
        where: { id },
        data: { isSuspended: true, suspendedAt: new Date(), suspendedReason: reason },
      });

      await writeAuditLog(req.user.id, 'SUSPEND_USER', 'USER', id, reason, { isSuspended: false }, { isSuspended: true }, req.ip);

      await notificationService.create(id, {
        type: 'ACCOUNT_SUSPENDED',
        title: 'Account Suspended',
        message: `Your account has been suspended. Reason: ${reason}`,
        data: { reason },
      });

      // Send suspension email
      if (target.email) {
        const appealUrl = `${process.env.FRONTEND_URL || 'https://1hrlearning.com'}/appeal/${id}`;
        await emailService.sendAccountSuspensionNotice(target.email, target.displayName, reason, appealUrl);
      }

      res.json({ success: true, message: 'User suspended' });
    } catch (error) { next(error); }
  },

  async banUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body as { reason: string };
      if (req.user.id === id) throw new AppError('Cannot ban yourself', 400);

      const target = await prisma.user.findUnique({ where: { id }, select: { isBanned: true } });
      if (!target) throw new AppError('User not found', 404);
      if (target.isBanned) throw new AppError('User is already banned', 400);

      await prisma.user.update({
        where: { id },
        data: { isBanned: true, isSuspended: false, bannedAt: new Date(), bannedReason: reason, isActive: false },
      });

      await writeAuditLog(req.user.id, 'BAN_USER', 'USER', id, reason, { isBanned: false }, { isBanned: true }, req.ip);

      res.json({ success: true, message: 'User banned' });
    } catch (error) { next(error); }
  },

  async reinstateUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const target = await prisma.user.findUnique({ where: { id }, select: { isSuspended: true, isBanned: true } });
      if (!target) throw new AppError('User not found', 404);

      await prisma.user.update({
        where: { id },
        data: { isSuspended: false, isBanned: false, isActive: true, suspendedReason: null, bannedReason: null },
      });

      await writeAuditLog(req.user.id, 'REINSTATE_USER', 'USER', id, 'Account reinstated', undefined, { isSuspended: false, isBanned: false }, req.ip);

      await notificationService.create(id, {
        type: 'ACCOUNT_REINSTATED',
        title: 'Account Reinstated',
        message: 'Your account has been reinstated. Welcome back!',
        data: {},
      });

      res.json({ success: true, message: 'User reinstated' });
    } catch (error) { next(error); }
  },

  async updateUserRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { role } = req.body as { role: string };

      if (!['USER', 'ADMIN', 'MODERATOR', 'SUPPORT'].includes(role)) throw new AppError('Invalid role', 400);

      if (role !== 'ADMIN') {
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
        const targetUser = await prisma.user.findUnique({ where: { id }, select: { role: true } });
        if (targetUser?.role === 'ADMIN' && adminCount <= 1) throw new AppError('Cannot remove the last admin', 400);
      }

      const before = await prisma.user.findUnique({ where: { id }, select: { role: true } });
      const user = await prisma.user.update({
        where: { id },
        data: { role: role as never },
        select: { id: true, email: true, username: true, role: true },
      });

      await writeAuditLog(req.user.id, 'UPDATE_ROLE', 'USER', id, `Role changed to ${role}`, { role: before?.role }, { role }, req.ip);

      res.json({ success: true, data: user });
    } catch (error) { next(error); }
  },

  async updateUserStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive } = req.body as { isActive: boolean };
      if (req.user.id === id) throw new AppError('Cannot deactivate your own account', 400);

      const user = await prisma.user.update({
        where: { id },
        data: { isActive: Boolean(isActive) },
        select: { id: true, email: true, username: true, isActive: true },
      });

      res.json({ success: true, data: user });
    } catch (error) { next(error); }
  },

  async adjustUserPoints(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { action, amount, reason, notifyUser } = req.body as { action: 'GRANT' | 'DEDUCT' | 'RESET'; amount: number; reason: string; notifyUser?: boolean };

      await pointsService.adminAdjust(req.user.id, id, action, amount, reason, notifyUser ?? false, req.ip);
      res.json({ success: true, message: `Points ${action.toLowerCase()}ed successfully` });
    } catch (error) { next(error); }
  },

  // ── Sessions ───────────────────────────────────────────────────────────────

  async listSessions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, type, topic, userId, flaggedOnly, page = '1', limit = '20' } = req.query as Record<string, string>;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, parseInt(limit, 10) || 20);
      const skip = (pageNum - 1) * limitNum;

      const where: Record<string, unknown> = {
        ...(status ? { status } : {}),
        ...(type === 'public' ? { isPublic: true } : type === 'private' ? { isPublic: false } : {}),
        ...(topic ? { skill: { category: topic } } : {}),
        ...(userId ? { OR: [{ teacherId: userId }, { learnerId: userId }] } : {}),
        ...(flaggedOnly === 'true' ? { flags: { some: { status: 'OPEN' } } } : {}),
      };

      const [sessions, total] = await Promise.all([
        prisma.session.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            skill: true,
            teacher: { select: { id: true, username: true, displayName: true } },
            learner: { select: { id: true, username: true, displayName: true } },
            _count: { select: { flags: { where: { status: 'OPEN' } } } },
          },
        }),
        prisma.session.count({ where }),
      ]);

      res.json({
        success: true, data: sessions,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum), hasNext: skip + sessions.length < total, hasPrev: pageNum > 1 },
      });
    } catch (error) { next(error); }
  },

  async getSessionById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await prisma.session.findUnique({
        where: { id: req.params.id },
        include: {
          skill: true,
          teacher: { select: { id: true, username: true, displayName: true, email: true } },
          learner: { select: { id: true, username: true, displayName: true, email: true } },
          ratings: true,
          testimonials: true,
          pointTransactions: { orderBy: { createdAt: 'asc' } },
          flags: { include: { reporter: { select: { id: true, username: true } } } },
          auditLogs: { orderBy: { createdAt: 'desc' } },
        },
      });
      if (!session) throw new AppError('Session not found', 404);
      res.json({ success: true, data: session });
    } catch (error) { next(error); }
  },

  async overrideSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { action, reason } = req.body as { action: string; reason: string };

      const session = await prisma.session.findUnique({
        where: { id },
        select: { id: true, status: true, teacherId: true, learnerId: true, durationMinutes: true, skillId: true },
      });
      if (!session) throw new AppError('Session not found', 404);

      switch (action) {
        case 'OVERRIDE_NO_SHOW_LEARNER':
          if (session.learnerId) {
            await prisma.session.update({ where: { id }, data: { status: 'COMPLETED', completedAt: new Date() } });
          }
          break;
        case 'OVERRIDE_NO_SHOW_SHARER':
          if (session.learnerId) {
            await prisma.session.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason } });
          }
          break;
        case 'MANUALLY_COMPLETE':
          await prisma.session.update({ where: { id }, data: { status: 'COMPLETED', completedAt: new Date() } });
          break;
        case 'CANCEL':
          await prisma.session.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason } });
          break;
        case 'REVERSE_POINTS': {
          const txs = await prisma.pointTransaction.findMany({ where: { sessionId: id } });
          for (const tx of txs) {
            await prisma.user.update({ where: { id: tx.userId }, data: { pointsBalance: { decrement: tx.amount } } });
          }
          break;
        }
      }

      await writeAuditLog(req.user.id, `SESSION_${action}`, 'SESSION', id, reason, { status: session.status }, undefined, req.ip);
      res.json({ success: true, message: `Session action ${action} applied` });
    } catch (error) { next(error); }
  },

  // ── Point Config ───────────────────────────────────────────────────────────

  async getPointConfig(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const configs = await prisma.pointConfig.findMany({ orderBy: { key: 'asc' } });
      const defaults = {
        [POINT_CONFIG_KEYS.SIGNUP_BONUS]: { value: POINTS.REGISTRATION_BONUS, description: 'Points awarded on signup' },
        [POINT_CONFIG_KEYS.PER_30_MIN]: { value: POINTS.PER_30_MIN, description: 'Points per 30 minutes of session' },
        [POINT_CONFIG_KEYS.RATING_BONUS_5_STAR]: { value: POINTS.RATING_BONUS_5_STAR, description: '5-star rating bonus for sharer' },
        [POINT_CONFIG_KEYS.RATING_BONUS_4_STAR]: { value: POINTS.RATING_BONUS_4_STAR, description: '4-star rating bonus for sharer' },
        [POINT_CONFIG_KEYS.RATING_BONUS_3_STAR]: { value: POINTS.RATING_BONUS_3_STAR, description: '3-star rating bonus for sharer' },
        [POINT_CONFIG_KEYS.NO_SHOW_SHARER_PENALTY]: { value: POINTS.NO_SHOW_SHARER_PENALTY, description: 'Penalty for sharer no-show' },
        [POINT_CONFIG_KEYS.MAX_BALANCE]: { value: POINTS.MAX_BALANCE, description: 'Maximum point balance per user' },
        [POINT_CONFIG_KEYS.EXPIRY_MONTHS]: { value: POINTS.EXPIRY_MONTHS, description: 'Months before inactive points expire' },
        [POINT_CONFIG_KEYS.MAX_SESSIONS_PER_WEEK]: { value: POINTS.MAX_SESSIONS_PER_WEEK, description: 'Max sessions a sharer can host per week' },
        [POINT_CONFIG_KEYS.MIN_FITMENT_SCORE]: { value: 40, description: 'Minimum fitment score to appear in match list' },
      };

      const merged = Object.entries(defaults).map(([key, def]) => {
        const stored = configs.find((c) => c.key === key);
        return { key, value: stored?.value ?? def.value, description: def.description, isOverridden: !!stored };
      });

      res.json({ success: true, data: merged });
    } catch (error) { next(error); }
  },

  async updatePointConfig(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { key, value, reason } = req.body as { key: string; value: number; reason: string };

      const existing = await prisma.pointConfig.findUnique({ where: { key } });
      const before = existing?.value;

      await prisma.pointConfig.upsert({
        where: { key },
        create: { key, value, description: key, updatedById: req.user.id },
        update: { value, updatedById: req.user.id },
      });

      await writeAuditLog(req.user.id, 'UPDATE_POINT_CONFIG', 'POINT_CONFIG', key, reason, { value: before }, { value }, req.ip);
      await cacheDel('admin:dashboard');

      res.json({ success: true, message: `Point config '${key}' updated to ${value}` });
    } catch (error) { next(error); }
  },

  // ── Point Economy Health ───────────────────────────────────────────────────

  async getPointEconomyHealth(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);

      const [
        totalInCirculation,
        lockedToday,
        transferredToday,
        expiredThisMonth,
        avgBalance,
        zeroBalanceCount,
        highBalanceCount,
        adminGrantsToday,
      ] = await Promise.all([
        prisma.user.aggregate({ _sum: { pointsBalance: true } }),
        prisma.user.aggregate({ _sum: { pointsLocked: true } }),
        prisma.pointTransaction.aggregate({
          where: { type: 'EARNED_TEACHING', createdAt: { gte: today } },
          _sum: { amount: true },
        }),
        prisma.pointTransaction.aggregate({
          where: { type: 'EXPIRY', createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
          _sum: { amount: true },
        }),
        prisma.user.aggregate({ where: { isActive: true }, _avg: { pointsBalance: true } }),
        prisma.user.count({ where: { pointsBalance: 0, isActive: true } }),
        prisma.user.count({ where: { pointsBalance: { gte: 150 }, isActive: true } }),
        prisma.pointTransaction.aggregate({
          where: { type: 'ADMIN_GRANT', createdAt: { gte: today } },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalInCirculation: totalInCirculation._sum.pointsBalance ?? 0,
          lockedToday: lockedToday._sum.pointsLocked ?? 0,
          transferredToday: transferredToday._sum.amount ?? 0,
          expiredThisMonth: Math.abs(expiredThisMonth._sum.amount ?? 0),
          averageBalance: Math.round(avgBalance._avg.pointsBalance ?? 0),
          zeroBalanceUsers: zeroBalanceCount,
          highBalanceUsers: highBalanceCount,
          adminGrantsToday: { total: adminGrantsToday._sum.amount ?? 0, count: adminGrantsToday._count },
        },
      });
    } catch (error) { next(error); }
  },

  // ── Analytics ─────────────────────────────────────────────────────────────

  async getAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { type = 'users', from, to } = req.query as Record<string, string>;
      const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = to ? new Date(to) : new Date();

      if (type === 'users') {
        const [totalRegistrations, onboardingComplete, dualDeclared, retentionData] = await Promise.all([
          prisma.user.count({ where: { createdAt: { gte: fromDate, lte: toDate } } }),
          prisma.user.count({ where: { isOnboardingComplete: true, createdAt: { gte: fromDate, lte: toDate } } }),
          prisma.user.count({
            where: {
              createdAt: { gte: fromDate, lte: toDate },
              skills: { some: { isTeaching: true } },
              AND: [{ skills: { some: { isLearning: true } } }],
            },
          }),
          prisma.user.count({
            where: {
              createdAt: { gte: fromDate, lte: toDate },
              lastActiveAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          }),
        ]);

        res.json({ success: true, data: { totalRegistrations, onboardingComplete, dualDeclared, retention7d: retentionData } });
      } else if (type === 'sessions') {
        const [created, confirmed, completed, noShows, avgDuration, topTopics] = await Promise.all([
          prisma.session.count({ where: { createdAt: { gte: fromDate, lte: toDate } } }),
          prisma.session.count({ where: { status: { in: ['CONFIRMED', 'COMPLETED', 'RATED'] }, createdAt: { gte: fromDate, lte: toDate } } }),
          prisma.session.count({ where: { status: { in: ['COMPLETED', 'RATED'] }, completedAt: { gte: fromDate, lte: toDate } } }),
          prisma.session.count({ where: { status: 'NO_SHOW', createdAt: { gte: fromDate, lte: toDate } } }),
          prisma.session.aggregate({ where: { status: { in: ['COMPLETED', 'RATED'] } }, _avg: { durationMinutes: true } }),
          prisma.session.groupBy({
            by: ['skillId'],
            where: { status: { in: ['COMPLETED', 'RATED'] }, completedAt: { gte: fromDate, lte: toDate } },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
          }),
        ]);

        res.json({ success: true, data: { created, confirmed, completed, noShows, averageDuration: avgDuration._avg.durationMinutes, topTopics } });
      } else if (type === 'economy') {
        const [issued, spent, expired] = await Promise.all([
          prisma.pointTransaction.aggregate({
            where: { amount: { gt: 0 }, type: { in: ['EARNED_TEACHING', 'BONUS', 'ADMIN_GRANT'] }, createdAt: { gte: fromDate, lte: toDate } },
            _sum: { amount: true },
          }),
          prisma.pointTransaction.aggregate({
            where: { type: 'SPENT_LEARNING', createdAt: { gte: fromDate, lte: toDate } },
            _sum: { amount: true },
          }),
          prisma.pointTransaction.aggregate({
            where: { type: 'EXPIRY', createdAt: { gte: fromDate, lte: toDate } },
            _sum: { amount: true },
          }),
        ]);

        res.json({
          success: true,
          data: {
            issued: issued._sum.amount ?? 0,
            spent: Math.abs(spent._sum.amount ?? 0),
            netFlow: (issued._sum.amount ?? 0) + (spent._sum.amount ?? 0),
            expired: Math.abs(expired._sum.amount ?? 0),
          },
        });
      } else if (type === 'matching') {
        const [avgMatches, avgFitment, interestCount, confirmedCount] = await Promise.all([
          prisma.user.aggregate({ _avg: { totalSessionsLearned: true, totalSessionsTaught: true } }),
          prisma.user.aggregate({ _avg: { averageRating: true } }),
          prisma.session.count({ where: { createdAt: { gte: fromDate, lte: toDate } } }),
          prisma.session.count({ where: { status: { in: ['CONFIRMED', 'COMPLETED', 'RATED'] }, createdAt: { gte: fromDate, lte: toDate } } }),
        ]);

        res.json({
          success: true,
          data: {
            avgSessionsLearned: avgMatches._avg.totalSessionsLearned,
            avgSessionsTaught: avgMatches._avg.totalSessionsTaught,
            avgRating: avgFitment._avg.averageRating,
            interestToApprovalRate: interestCount > 0 ? Math.round((confirmedCount / interestCount) * 100) : 0,
          },
        });
      } else {
        throw new AppError('Invalid analytics type. Use: users, sessions, economy, matching', 400);
      }
    } catch (error) { next(error); }
  },

  // ── Moderation ─────────────────────────────────────────────────────────────

  async listFlags(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { targetType, status = 'OPEN', page = '1', limit = '20' } = req.query as Record<string, string>;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, parseInt(limit, 10) || 20);
      const skip = (pageNum - 1) * limitNum;

      const where = {
        ...(targetType ? { targetType: targetType as never } : {}),
        ...(status ? { status: status as never } : {}),
      };

      const [flags, total] = await Promise.all([
        prisma.flag.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: { reporter: { select: { id: true, username: true } }, resolver: { select: { id: true, username: true } } },
        }),
        prisma.flag.count({ where }),
      ]);

      res.json({
        success: true, data: flags,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum), hasNext: skip + flags.length < total, hasPrev: pageNum > 1 },
      });
    } catch (error) { next(error); }
  },

  async resolveFlag(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status, resolutionNote } = req.body as { status: 'RESOLVED' | 'DISMISSED'; resolutionNote?: string };

      const flag = await prisma.flag.findUnique({ where: { id } });
      if (!flag) throw new AppError('Flag not found', 404);
      if (flag.status !== 'OPEN') throw new AppError('Flag is already resolved', 400);

      const updated = await prisma.flag.update({
        where: { id },
        data: { status, resolvedById: req.user.id, resolutionNote: resolutionNote ?? null, resolvedAt: new Date() },
      });

      await writeAuditLog(req.user.id, 'RESOLVE_FLAG', 'FLAG', id, resolutionNote ?? status, { status: 'OPEN' }, { status }, req.ip);

      res.json({ success: true, data: updated });
    } catch (error) { next(error); }
  },

  // ── Platform Config ────────────────────────────────────────────────────────

  async getPlatformConfig(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const configs = await prisma.platformConfig.findMany({ orderBy: { key: 'asc' } });
      const defaults: Record<string, string> = {
        [PLATFORM_CONFIG_KEYS.MAINTENANCE_MODE]: 'false',
        [PLATFORM_CONFIG_KEYS.NEW_REGISTRATIONS]: 'open',
        [PLATFORM_CONFIG_KEYS.SHARER_ONBOARDING]: 'open',
        [PLATFORM_CONFIG_KEYS.POINT_ECONOMY_ACTIVE]: 'true',
        [PLATFORM_CONFIG_KEYS.MATCHING_ENGINE_ACTIVE]: 'true',
        [PLATFORM_CONFIG_KEYS.PUBLIC_SESSIONS_ENABLED]: 'true',
        [PLATFORM_CONFIG_KEYS.TESTIMONIALS_ENABLED]: 'true',
        [PLATFORM_CONFIG_KEYS.MIN_PROFILE_COMPLETENESS]: '80',
        [PLATFORM_CONFIG_KEYS.SESSION_AUTO_COMPLETE_DELAY]: '0',
        [PLATFORM_CONFIG_KEYS.SUPPORT_EMAIL]: 'support@platform.com',
      };

      const merged = Object.keys(defaults).map((key) => ({
        key,
        value: configs.find((c) => c.key === key)?.value ?? defaults[key],
        isOverridden: configs.some((c) => c.key === key),
      }));

      res.json({ success: true, data: merged });
    } catch (error) { next(error); }
  },

  async updatePlatformConfig(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { key, value, reason } = req.body as { key: string; value: string; reason: string };

      const existing = await prisma.platformConfig.findUnique({ where: { key } });
      const before = existing?.value;

      await prisma.platformConfig.upsert({
        where: { key },
        create: { key, value, description: key, updatedById: req.user.id },
        update: { value, updatedById: req.user.id },
      });

      await writeAuditLog(req.user.id, 'UPDATE_PLATFORM_CONFIG', 'PLATFORM_CONFIG', key, reason, { value: before }, { value }, req.ip);

      res.json({ success: true, message: `Platform config '${key}' updated` });
    } catch (error) { next(error); }
  },

  // ── Audit Log ──────────────────────────────────────────────────────────────

  async getAuditLog(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { adminId, targetType, page = '1', limit = '50' } = req.query as Record<string, string>;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, parseInt(limit, 10) || 50);
      const skip = (pageNum - 1) * limitNum;

      const where = {
        ...(adminId ? { adminId } : {}),
        ...(targetType ? { targetType } : {}),
      };

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: { admin: { select: { id: true, username: true, displayName: true, role: true } } },
        }),
        prisma.auditLog.count({ where }),
      ]);

      res.json({
        success: true, data: logs,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum), hasNext: skip + logs.length < total, hasPrev: pageNum > 1 },
      });
    } catch (error) { next(error); }
  },

  // ── Ads ────────────────────────────────────────────────────────────────────

  async listAds(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, parseInt(limit, 10) || 20);
      const skip = (pageNum - 1) * limitNum;

      const where = status ? { status: status as never } : {};
      const [ads, total] = await Promise.all([
        prisma.ad.findMany({ where, skip, take: limitNum, orderBy: { createdAt: 'desc' } }),
        prisma.ad.count({ where }),
      ]);

      res.json({
        success: true, data: ads,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum), hasNext: skip + ads.length < total, hasPrev: pageNum > 1 },
      });
    } catch (error) { next(error); }
  },

  async createAd(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { advertiserName, title, body, targetUrl, topicCategories, placement, startDate, endDate } = req.body;
      const ad = await prisma.ad.create({
        data: {
          advertiserName, title, body, targetUrl,
          topicCategories: topicCategories ?? [],
          placement: placement ?? 'ALL',
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
        },
      });
      res.status(201).json({ success: true, data: ad });
    } catch (error) { next(error); }
  },

  async updateAd(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const existing = await prisma.ad.findUnique({ where: { id } });
      if (!existing) throw new AppError('Ad not found', 404);

      const { status, ...rest } = req.body;
      const ad = await prisma.ad.update({
        where: { id },
        data: {
          ...rest,
          ...(status ? { status } : {}),
          ...(rest.startDate ? { startDate: new Date(rest.startDate) } : {}),
          ...(rest.endDate ? { endDate: new Date(rest.endDate) } : {}),
        },
      });
      res.json({ success: true, data: ad });
    } catch (error) { next(error); }
  },

  async deleteAd(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await prisma.ad.delete({ where: { id } });
      res.json({ success: true, message: 'Ad deleted' });
    } catch (error) { next(error); }
  },
};
