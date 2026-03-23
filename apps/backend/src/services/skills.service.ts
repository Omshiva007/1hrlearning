import { prisma } from '../utils/prisma';
import { AppError } from '../types';
import { cacheGet, cacheSet, cacheDel } from '../utils/redis';
import type { CreateSkillInput, AddUserSkillInput, SkillQueryInput } from '@1hrlearning/shared';
import { CACHE_TTL } from '@1hrlearning/shared';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class SkillsService {
  async listSkills(query: SkillQueryInput) {
    const cacheKey = `skills:list:${JSON.stringify(query)}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const where = {
      isApproved: true,
      ...(query.q ? { name: { contains: query.q, mode: 'insensitive' as const } } : {}),
      ...(query.category ? { category: query.category } : {}),
    };

    const skip = (query.page - 1) * query.limit;
    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { userCount: 'desc' },
      }),
      prisma.skill.count({ where }),
    ]);

    const result = {
      data: skills,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        hasNext: skip + skills.length < total,
        hasPrev: query.page > 1,
      },
    };

    await cacheSet(cacheKey, result, CACHE_TTL.SKILL_LIST);
    return result;
  }

  async getSkillById(id: string) {
    const cached = await cacheGet(`skill:${id}`);
    if (cached) return cached;

    const skill = await prisma.skill.findUnique({ where: { id, isApproved: true } });
    if (!skill) throw new AppError('Skill not found', 404);

    await cacheSet(`skill:${id}`, skill, CACHE_TTL.SKILL_LIST);
    return skill;
  }

  async getSkillBySlug(slug: string) {
    const skill = await prisma.skill.findUnique({ where: { slug, isApproved: true } });
    if (!skill) throw new AppError('Skill not found', 404);
    return skill;
  }

  async createSkill(input: CreateSkillInput) {
    const slug = slugify(input.name);
    const existing = await prisma.skill.findFirst({
      where: { OR: [{ name: { equals: input.name, mode: 'insensitive' } }, { slug }] },
    });
    if (existing) throw new AppError('Skill already exists', 409);

    const skill = await prisma.skill.create({
      data: { ...input, slug },
    });

    const keys = await redis.keys('skills:list:*');
    if (keys.length > 0) await cacheDel(...keys);
    return skill;
  }

  async addUserSkill(userId: string, input: AddUserSkillInput) {
    const skill = await prisma.skill.findUnique({ where: { id: input.skillId } });
    if (!skill) throw new AppError('Skill not found', 404);

    const existing = await prisma.userSkill.findUnique({
      where: { userId_skillId: { userId, skillId: input.skillId } },
    });

    const userSkill = await prisma.userSkill.upsert({
      where: { userId_skillId: { userId, skillId: input.skillId } },
      create: {
        userId,
        skillId: input.skillId,
        level: input.level,
        isTeaching: input.isTeaching,
        isLearning: input.isLearning,
        description: input.description ?? null,
        yearsOfExperience: input.yearsOfExperience ?? null,
      },
      update: {
        level: input.level,
        isTeaching: input.isTeaching,
        isLearning: input.isLearning,
        description: input.description ?? null,
        yearsOfExperience: input.yearsOfExperience ?? null,
      },
      include: { skill: true },
    });

    if (!existing) {
      await prisma.skill.update({
        where: { id: input.skillId },
        data: { userCount: { increment: 1 } },
      });
    }

    await cacheDel(`user:${userId}:profile`, `skill:${input.skillId}`);
    return userSkill;
  }

  async removeUserSkill(userId: string, skillId: string) {
    const userSkill = await prisma.userSkill.findUnique({
      where: { userId_skillId: { userId, skillId } },
    });
    if (!userSkill) throw new AppError('Skill not found in your profile', 404);

    await prisma.userSkill.delete({ where: { userId_skillId: { userId, skillId } } });

    await prisma.skill.update({
      where: { id: skillId },
      data: { userCount: { decrement: 1 } },
    });

    await cacheDel(`user:${userId}:profile`, `skill:${skillId}`);
  }

  async getTeachersForSkill(skillId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [teachers, total] = await Promise.all([
      prisma.userSkill.findMany({
        where: { skillId, isTeaching: true, user: { isActive: true } },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              averageRating: true,
              ratingCount: true,
              totalSessionsTaught: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { user: { averageRating: 'desc' } },
      }),
      prisma.userSkill.count({ where: { skillId, isTeaching: true } }),
    ]);

    return {
      data: teachers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + teachers.length < total,
        hasPrev: page > 1,
      },
    };
  }
}

export const skillsService = new SkillsService();
