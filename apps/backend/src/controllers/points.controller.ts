import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import { pointsService } from '../services/points.service';

export const pointsController = {
  async getBalance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await pointsService.getBalance(req.user.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await pointsService.getHistory(req.user.id, Number(page), Number(limit));
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },
};
