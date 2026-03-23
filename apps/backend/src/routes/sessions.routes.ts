import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { sessionsController } from '../controllers/sessions.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createSessionSchema, updateSessionSchema, rateSessionSchema } from '@1hrlearning/shared';
import type { AuthenticatedRequest } from '../types';

const router = Router();

const auth = requireAuth as unknown as (req: Request, res: Response, next: NextFunction) => void;
const wrap = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthenticatedRequest, res, next);

router.get('/', auth, wrap(sessionsController.list));
router.get('/:id', auth, wrap(sessionsController.getById));
router.post('/', auth, validate(createSessionSchema), wrap(sessionsController.create));
router.patch('/:id', auth, validate(updateSessionSchema), wrap(sessionsController.update));
router.post('/:id/rate', auth, validate(rateSessionSchema), wrap(sessionsController.rate));

export default router;
