import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';
import { AppError } from '../types';

export async function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401);
    }

    // Also check suspension/ban
    const fullUser = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isSuspended: true, isBanned: true },
    });
    if (fullUser?.isBanned) throw new AppError('Account has been banned', 403);
    if (fullUser?.isSuspended) throw new AppError('Account is suspended', 403);

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Invalid or expired token', 401));
    }
  }
}

// Role hierarchy: ADMIN > MODERATOR > SUPPORT > USER
const ROLE_HIERARCHY: Record<string, number> = {
  USER: 0,
  SUPPORT: 1,
  MODERATOR: 2,
  ADMIN: 3,
};

export function requireRole(minimumRole: string) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Unauthorized', 401));
      return;
    }
    const userLevel = ROLE_HIERARCHY[req.user.role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? 999;
    if (userLevel < requiredLevel) {
      next(new AppError('Insufficient permissions', 403));
      return;
    }
    next();
  };
}
