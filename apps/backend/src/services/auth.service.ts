import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { redis } from '../utils/redis';
import { AppError } from '../types';
import type { RegisterInput, LoginInput } from '@1hrlearning/shared';
import { POINTS, PASSWORD } from '@1hrlearning/shared';
import { config } from '../config';

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export class AuthService {
  async register(input: RegisterInput) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: input.email }, { username: input.username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === input.email) {
        throw new AppError('Email already in use', 409);
      }
      throw new AppError('Username already taken', 409);
    }

    const passwordHash = await bcrypt.hash(input.password, PASSWORD.SALT_ROUNDS);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: input.email,
          username: input.username,
          displayName: input.displayName,
          passwordHash,
          timezone: input.timezone ?? 'UTC',
          pointsBalance: POINTS.INITIAL_BALANCE + POINTS.REGISTRATION_BONUS,
        },
      });

      await tx.pointTransaction.create({
        data: {
          userId: newUser.id,
          type: 'BONUS',
          amount: POINTS.INITIAL_BALANCE + POINTS.REGISTRATION_BONUS,
          balanceAfter: POINTS.INITIAL_BALANCE + POINTS.REGISTRATION_BONUS,
          description: 'Welcome bonus',
        },
      });

      return newUser;
    });

    const tokens = await this._issueTokens(user.id, user.email, user.role);

    const { passwordHash: _ph, ...safeUser } = user;
    return { user: safeUser, ...tokens };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !user.isActive) {
      throw new AppError('Invalid credentials', 401);
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    const tokens = await this._issueTokens(user.id, user.email, user.role);
    const { passwordHash: _ph, ...safeUser } = user;
    return { user: safeUser, ...tokens };
  }

  async refreshTokens(refreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new AppError('Refresh token expired or not found', 401);
    }

    if (!storedToken.user.isActive) {
      throw new AppError('Account is inactive', 401);
    }

    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    return this._issueTokens(storedToken.user.id, storedToken.user.email, storedToken.user.role);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken, userId },
      });
    }
    await redis.del(`user:${userId}:sessions`);
  }

  async logoutAll(userId: string) {
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await redis.del(`user:${userId}:sessions`);
  }

  private async _issueTokens(userId: string, email: string, role: string) {
    const tokenId = uuidv4();
    const accessToken = signAccessToken({ sub: userId, email, role });
    const refreshToken = signRefreshToken({ sub: userId, tokenId });

    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt },
    });

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
