import { prisma } from '../utils/prisma';
import { AppError } from '../types';
import { cacheGet, cacheSet, cacheDel } from '../utils/redis';
import type { UpdateProfileInput } from '@1hrlearning/shared';
import { CACHE_TTL } from '@1hrlearning/shared';

const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  timezone: true,
  isVerified: true,
  pointsBalance: true,
  totalSessionsTaught: true,
  totalSessionsLearned: true,
  averageRating: true,
  ratingCount: true,
  createdAt: true,
  skills: {
    include: {
      skill: true,
    },
  },
};

export class UsersService {
  async getUserById(id: string) {
    const cached = await cacheGet<Record<string, unknown>>(`user:${id}:profile`);
    if (cached) return cached;

    const user = await prisma.user.findUnique({
      where: { id, isActive: true },
      select: PUBLIC_USER_SELECT,
    });

    if (!user) throw new AppError('User not found', 404);

    await cacheSet(`user:${id}:profile`, user, CACHE_TTL.USER_PROFILE);
    return user;
  }

  async getUserByUsername(username: string) {
    const cached = await cacheGet<Record<string, unknown>>(`user:username:${username}`);
    if (cached) return cached;

    const user = await prisma.user.findUnique({
      where: { username, isActive: true },
      select: PUBLIC_USER_SELECT,
    });

    if (!user) throw new AppError('User not found', 404);

    await cacheSet(`user:username:${username}`, user, CACHE_TTL.USER_PROFILE);
    return user;
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.bio !== undefined ? { bio: input.bio } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
      },
      select: PUBLIC_USER_SELECT,
    });

    await cacheDel(`user:${userId}:profile`, `user:username:${user.username}`);
    return user;
  }

  async searchUsers(query: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { displayName: { contains: query, mode: 'insensitive' } },
            { username: { contains: query, mode: 'insensitive' } },
            { bio: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: PUBLIC_USER_SELECT,
        skip,
        take: limit,
        orderBy: { totalSessionsTaught: 'desc' },
      }),
      prisma.user.count({
        where: {
          isActive: true,
          OR: [
            { displayName: { contains: query, mode: 'insensitive' } },
            { username: { contains: query, mode: 'insensitive' } },
          ],
        },
      }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + users.length < total,
        hasPrev: page > 1,
      },
    };
  }

  async getLeaderboard(limit = 20) {
    return prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        totalSessionsTaught: true,
        totalSessionsLearned: true,
        averageRating: true,
        pointsBalance: true,
      },
      orderBy: { totalSessionsTaught: 'desc' },
      take: limit,
    });
  }

  async deactivateAccount(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    await cacheDel(`user:${userId}:profile`);
  }
}

export const usersService = new UsersService();
