import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { sessionsController } from '../controllers/sessions.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createSessionSchema, updateSessionSchema, rateSessionSchema, applyToSessionSchema, updateSessionApplicationSchema } from '@1hrlearning/shared';
import type { AuthenticatedRequest } from '../types';

const router = Router();

const auth = requireAuth as unknown as (req: Request, res: Response, next: NextFunction) => void;
const wrap = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthenticatedRequest, res, next);

router.get('/discover', auth, wrap(sessionsController.discover));
router.get('/', auth, wrap(sessionsController.list));
router.get('/:id', auth, wrap(sessionsController.getById));
router.post('/', auth, validate(createSessionSchema), wrap(sessionsController.create));
router.patch('/:id', auth, validate(updateSessionSchema), wrap(sessionsController.update));
router.post('/:id/rate', auth, validate(rateSessionSchema), wrap(sessionsController.rate));
router.post('/:id/apply', auth, validate(applyToSessionSchema), wrap(sessionsController.apply));
router.get('/:id/applications', auth, wrap(sessionsController.listApplications));
router.patch('/:id/applications/:applicationId', auth, validate(updateSessionApplicationSchema), wrap(sessionsController.updateApplication));
router.get('/:id/calendar.ics', auth, wrap(sessionsController.calendar));

export default router;
