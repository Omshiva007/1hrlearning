import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import { sessionsService } from '../services/sessions.service';

export const sessionsController = {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await sessionsService.createSession(req.user.id, req.body);
      res.status(201).json({ success: true, data: session });
    } catch (error) {
      next(error);
    }
  },

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role = 'all', page = 1, limit = 20 } = req.query;
      const result = await sessionsService.getSessions(
        req.user.id,
        role as 'teacher' | 'learner' | 'all',
        Number(page),
        Number(limit),
      );
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await sessionsService.getSessionById(req.params.id, req.user.id);
      res.json({ success: true, data: session });
    } catch (error) {
      next(error);
    }
  },

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await sessionsService.updateSession(req.params.id, req.user.id, req.body);
      res.json({ success: true, data: session });
    } catch (error) {
      next(error);
    }
  },

  async rate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rating = await sessionsService.rateSession(req.params.id, req.user.id, req.body);
      res.status(201).json({ success: true, data: rating });
    } catch (error) {
      next(error);
    }
  },
};
