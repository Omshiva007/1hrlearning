import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { notificationsController } from '../controllers/notifications.controller';
import { requireAuth } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';

const router = Router();

const auth = requireAuth as unknown as (req: Request, res: Response, next: NextFunction) => void;
const wrap = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthenticatedRequest, res, next);

router.get('/', auth, wrap(notificationsController.list));
router.patch('/read-all', auth, wrap(notificationsController.markAllAsRead));
router.patch('/:id/read', auth, wrap(notificationsController.markAsRead));
router.delete('/:id', auth, wrap(notificationsController.delete));

export default router;
