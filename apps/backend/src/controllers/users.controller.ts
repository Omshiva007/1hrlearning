import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import { usersService } from '../services/users.service';
import { matchingService } from '../services/matching.service';
import { notificationService } from '../services/notification.service';
import { emailService } from '../services/email.service';
import { prisma } from '../utils/prisma';

export const usersController = {
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.getUserById(req.params.id);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },

  async getByUsername(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.getUserByUsername(req.params.username);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.updateProfile(req.user.id, req.body);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },

  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q = '', page = 1, limit = 20 } = req.query;
      const result = await usersService.searchUsers(
        String(q),
        Number(page),
        Number(limit),
      );
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  async getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit = 20 } = req.query;
      const data = await usersService.getLeaderboard(Number(limit));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getMatches(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit = 10 } = req.query;
      const matches = await matchingService.findMatches(req.user.id, Number(limit));

      // Send first match email if this is the user's first match discovery
      if (matches.length > 0) {
        const existingNotif = await prisma.notification.findFirst({
          where: { userId: req.user.id, type: 'FIRST_MATCH_FOUND' },
        });

        if (!existingNotif) {
          const firstMatch = matches[0];
          const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { displayName: true, email: true },
          });

          if (user?.email) {
            const topSkill = firstMatch.canTeachMe[0]?.name || firstMatch.matchedSkills[0]?.name || 'a skill';
            await Promise.all([
              notificationService.create(req.user.id, {
                type: 'FIRST_MATCH_FOUND',
                title: 'Your First Match!',
                message: `We found someone who can teach you ${topSkill}!`,
                data: { matchUserId: firstMatch.userId, skillName: topSkill },
              }),
              emailService.sendFirstMatchFound(user.email, user.displayName, {
                matchName: firstMatch.user.displayName,
                skillName: topSkill,
                matchUrl: `${process.env.FRONTEND_URL || 'https://1hrlearning.com'}/users/${firstMatch.userId}`,
              }),
            ]);
          }
        }
      }

      res.json({ success: true, data: matches });
    } catch (error) {
      next(error);
    }
  },

  async deactivateAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await usersService.deactivateAccount(req.user.id);
      res.json({ success: true, message: 'Account deactivated' });
    } catch (error) {
      next(error);
    }
  },

  async getAdPreferences(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const prefs = await usersService.getAdPreferences(req.user.id);
      res.json({ success: true, data: prefs });
    } catch (error) {
      next(error);
    }
  },

  async updateAdPreferences(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { adEmailOptOut } = req.body;
      const prefs = await usersService.updateAdPreferences(req.user.id, Boolean(adEmailOptOut));
      res.json({ success: true, data: prefs });
    } catch (error) {
      next(error);
    }
  },
};
