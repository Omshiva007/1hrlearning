import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import { notificationService } from '../services/notification.service';

export const notificationsController = {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 20, unread } = req.query;
      const result = await notificationService.getNotifications(
        req.user.id,
        Number(page),
        Number(limit),
        unread === 'true',
      );
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const notification = await notificationService.markAsRead(req.params.id, req.user.id);
      res.json({ success: true, data: notification });
    } catch (error) {
      next(error);
    }
  },

  async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationService.markAllAsRead(req.user.id);
      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationService.deleteNotification(req.params.id, req.user.id);
      res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
      next(error);
    }
  },
};
