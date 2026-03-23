import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import { connectionsService } from '../services/connections.service';

export const connectionsController = {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const connection = await connectionsService.sendRequest(req.user.id, req.body);
      res.status(201).json({ success: true, data: connection });
    } catch (error) {
      next(error);
    }
  },

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const result = await connectionsService.getConnections(
        req.user.id,
        status as string | undefined,
        Number(page),
        Number(limit),
      );
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const connection = await connectionsService.updateConnection(
        req.params.id,
        req.user.id,
        req.body,
      );
      res.json({ success: true, data: connection });
    } catch (error) {
      next(error);
    }
  },
};
