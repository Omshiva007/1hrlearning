import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import { authService } from '../services/auth.service';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshTokens(refreshToken);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      await authService.logout(req.user.id, refreshToken);
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  },

  async logoutAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.logoutAll(req.user.id);
      res.json({ success: true, message: 'Logged out from all devices' });
    } catch (error) {
      next(error);
    }
  },

  async me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { usersService } = await import('../services/users.service');
      const user = await usersService.getUserById(req.user.id);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },
};
