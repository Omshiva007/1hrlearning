import { Router } from 'express';
import { pointsController } from '../controllers/points.controller';
import { requireAuth } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';

const router = Router();

const auth = requireAuth as never;
const wrap = (fn: (req: AuthenticatedRequest, res: never, next: never) => Promise<void>) =>
  (req: never, res: never, next: never) => fn(req as AuthenticatedRequest, res, next);

router.get('/balance', auth, wrap(pointsController.getBalance));
router.get('/history', auth, wrap(pointsController.getHistory));

export default router;
