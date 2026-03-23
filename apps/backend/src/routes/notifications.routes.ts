import { Router } from 'express';
import { notificationsController } from '../controllers/notifications.controller';
import { requireAuth } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';

const router = Router();

const auth = requireAuth as never;
const wrap = (fn: (req: AuthenticatedRequest, res: never, next: never) => Promise<void>) =>
  (req: never, res: never, next: never) => fn(req as AuthenticatedRequest, res, next);

router.get('/', auth, wrap(notificationsController.list));
router.patch('/read-all', auth, wrap(notificationsController.markAllAsRead));
router.patch('/:id/read', auth, wrap(notificationsController.markAsRead));
router.delete('/:id', auth, wrap(notificationsController.delete));

export default router;
