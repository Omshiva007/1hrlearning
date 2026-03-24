import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import { usersService } from '../services/users.service';
import { matchingService } from '../services/matching.service';

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
