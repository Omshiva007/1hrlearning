import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import { availabilityService } from '../services/availability.service';

export const availabilityController = {
  async getForUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.params.userId === 'me' ? req.user.id : req.params.userId) ?? req.user.id;
      const from = req.query.from ? new Date(req.query.from as string) : undefined;
      const to = req.query.to ? new Date(req.query.to as string) : undefined;
      const slots = await availabilityService.getForUser(userId, from, to);
      res.json({ success: true, data: slots });
    } catch (error) {
      next(error);
    }
  },

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const slot = await availabilityService.create(req.user.id, req.body);
      res.status(201).json({ success: true, data: slot });
    } catch (error) {
      next(error);
    }
  },

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const slot = await availabilityService.update(req.params.id, req.user.id, req.body);
      res.json({ success: true, data: slot });
    } catch (error) {
      next(error);
    }
  },

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await availabilityService.delete(req.params.id, req.user.id);
      res.json({ success: true, message: 'Availability slot deleted' });
    } catch (error) {
      next(error);
    }
  },
};
