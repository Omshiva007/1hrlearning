import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../types';
import { redis, cacheGet, cacheSet, cacheDel } from '../utils/redis';
import { SKILL_CATEGORIES, USER_ROLES } from '@1hrlearning/shared';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateId(id: string): void {
  if (!UUID_RE.test(id)) throw new AppError('Invalid ID format', 400);
}

const VALID_ROLES = Object.values(USER_ROLES) as string[];
const VALID_CATEGORIES = SKILL_CATEGORIES as readonly string[];

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

export const adminController = {
  // ── Dashboard ─────────────────────────────────────────────────────────────

  async getDashboard(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cacheKey = 'admin:dashboard';
      const cached = await cacheGet(cacheKey);
      if (cached) {
        res.json({ success: true, data: cached });
        return;
      }

      const [
        totalUsers,
        totalSkills,
        totalUserSkills,
        totalSessions,
        recentUsers,
        recentSkills,
      ] = await Promise.all([
        prisma.user.count({ where: { isActive: true } }),
        prisma.skill.count(),
        prisma.userSkill.count(),
        prisma.session.count(),
        prisma.user.findMany({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, username: true, displayName: true, email: true, role: true, createdAt: true },
        }),
        prisma.skill.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, name: true, category: true, userCount: true, createdAt: true },
        }),
      ]);

      // Category breakdown
      const categoryBreakdown = await prisma.skill.groupBy({
        by: ['category'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      });

      const data = {
        stats: { totalUsers, totalSkills, totalUserSkills, totalSessions },
        categoryBreakdown: categoryBreakdown.map((c: { category: string; _count: { id: number } }) => ({ category: c.category, count: c._count.id })),
        recentUsers,
        recentSkills,
      };

      await cacheSet(cacheKey, data, 60);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  // ── Skills ─────────────────────────────────────────────────────────────────

  async listSkills(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q, category, page = '1', limit = '20' } = req.query as Record<string, string>;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      if (q && q.length > 100) throw new AppError('Search query too long', 400);
      if (category && !VALID_CATEGORIES.includes(category)) {
        throw new AppError('Invalid category', 400);
      }

      const where = {
        ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
        ...(category ? { category } : {}),
      };

      const [skills, total] = await Promise.all([
        prisma.skill.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.skill.count({ where }),
      ]);

      res.json({
        success: true,
        data: skills,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasNext: skip + skills.length < total,
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async createSkill(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, description, category, subcategory, iconUrl, isApproved = true } = req.body as {
        name: string;
        description?: string;
        category: string;
        subcategory?: string;
        iconUrl?: string;
        isApproved?: boolean;
      };

      if (!name || !category) {
        throw new AppError('Name and category are required', 400);
      }
      if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
        throw new AppError('Name must be a non-empty string up to 100 characters', 400);
      }
      if (!VALID_CATEGORIES.includes(category)) {
        throw new AppError('Invalid category', 400);
      }
      if (description !== undefined && (typeof description !== 'string' || description.length > 500)) {
        throw new AppError('Description must be a string up to 500 characters', 400);
      }

      const slug = slugify(name);
      const existing = await prisma.skill.findFirst({
        where: { OR: [{ name: { equals: name, mode: 'insensitive' } }, { slug }] },
      });
      if (existing) throw new AppError('Skill already exists', 409);

      const skill = await prisma.skill.create({
        data: {
          name,
          slug,
          description: description ?? null,
          category,
          subcategory: subcategory ?? null,
          iconUrl: iconUrl ?? null,
          isApproved: Boolean(isApproved),
        },
      });

      await invalidateSkillsCaches();

      res.status(201).json({ success: true, data: skill });
    } catch (error) {
      next(error);
    }
  },

  async updateSkill(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      validateId(id);
      const { name, description, category, subcategory, iconUrl, isApproved } = req.body as {
        name?: string;
        description?: string;
        category?: string;
        subcategory?: string;
        iconUrl?: string;
        isApproved?: boolean;
      };

      if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100)) {
        throw new AppError('Name must be a non-empty string up to 100 characters', 400);
      }
      if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
        throw new AppError('Invalid category', 400);
      }
      if (description !== undefined && (typeof description !== 'string' || description.length > 500)) {
        throw new AppError('Description must be a string up to 500 characters', 400);
      }

      const existing = await prisma.skill.findUnique({ where: { id } });
      if (!existing) throw new AppError('Skill not found', 404);

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) {
        updateData.name = name;
        updateData.slug = slugify(name);
      }
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.category = category;
      if (subcategory !== undefined) updateData.subcategory = subcategory;
      if (iconUrl !== undefined) updateData.iconUrl = iconUrl;
      if (isApproved !== undefined) updateData.isApproved = Boolean(isApproved);

      const skill = await prisma.skill.update({ where: { id }, data: updateData });

      await invalidateSkillsCaches(`skill:${id}`);

      res.json({ success: true, data: skill });
    } catch (error) {
      next(error);
    }
  },

  async deleteSkill(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      validateId(id);

      const existing = await prisma.skill.findUnique({ where: { id } });
      if (!existing) throw new AppError('Skill not found', 404);

      await prisma.skill.delete({ where: { id } });

      await invalidateSkillsCaches(`skill:${id}`);

      res.json({ success: true, message: 'Skill deleted' });
    } catch (error) {
      next(error);
    }
  },

  // ── Categories ─────────────────────────────────────────────────────────────

  async listCategories(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryCounts = await prisma.skill.groupBy({
        by: ['category'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      });

      const countMap = new Map(categoryCounts.map((c: { category: string; _count: { id: number } }) => [c.category, c._count.id] as [string, number]));

      const categories = SKILL_CATEGORIES.map((cat: string) => ({
        name: cat,
        skillCount: countMap.get(cat) ?? 0,
      }));

      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  },

  // ── Users ──────────────────────────────────────────────────────────────────

  async listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q, role, page = '1', limit = '20' } = req.query as Record<string, string>;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      if (q && q.length > 100) throw new AppError('Search query too long', 400);
      if (role && !VALID_ROLES.includes(role)) {
        throw new AppError('Invalid role filter', 400);
      }

      const where = {
        ...(q
          ? {
              OR: [
                { username: { contains: q, mode: 'insensitive' as const } },
                { email: { contains: q, mode: 'insensitive' as const } },
                { displayName: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
        ...(role ? { role: role as 'USER' | 'ADMIN' | 'MODERATOR' } : {}),
      };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            role: true,
            isActive: true,
            isVerified: true,
            pointsBalance: true,
            totalSessionsTaught: true,
            totalSessionsLearned: true,
            createdAt: true,
            _count: { select: { skills: true } },
          },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        success: true,
        data: users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasNext: skip + users.length < total,
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async getUserById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      validateId(id);

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          timezone: true,
          role: true,
          isActive: true,
          isVerified: true,
          pointsBalance: true,
          totalSessionsTaught: true,
          totalSessionsLearned: true,
          averageRating: true,
          ratingCount: true,
          createdAt: true,
          skills: {
            include: { skill: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!user) throw new AppError('User not found', 404);

      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },

  async updateUserRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      validateId(id);
      const { role } = req.body as { role: string };

      if (!role || !VALID_ROLES.includes(role)) {
        throw new AppError('Invalid role', 400);
      }

      // Prevent removing the last admin
      if (role !== 'ADMIN') {
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
        const targetUser = await prisma.user.findUnique({ where: { id }, select: { role: true } });
        if (targetUser?.role === 'ADMIN' && adminCount <= 1) {
          throw new AppError('Cannot remove the last admin', 400);
        }
      }

      const user = await prisma.user.update({
        where: { id },
        data: { role: role as 'USER' | 'ADMIN' | 'MODERATOR' },
        select: { id: true, email: true, username: true, role: true },
      });

      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },

  async updateUserStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      validateId(id);
      const { isActive } = req.body as { isActive: boolean };

      // Prevent deactivating own account
      if (req.user.id === id) {
        throw new AppError('Cannot deactivate your own account', 400);
      }

      const user = await prisma.user.update({
        where: { id },
        data: { isActive: Boolean(isActive) },
        select: { id: true, email: true, username: true, isActive: true },
      });

      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },
};
