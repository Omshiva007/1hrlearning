import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { pointsController } from '../controllers/points.controller';
import { requireAuth } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';

const router = Router();

const auth = requireAuth as unknown as (req: Request, res: Response, next: NextFunction) => void;
const wrap = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthenticatedRequest, res, next);

router.get('/balance', auth, wrap(pointsController.getBalance));
router.get('/history', auth, wrap(pointsController.getHistory));

export default router;
