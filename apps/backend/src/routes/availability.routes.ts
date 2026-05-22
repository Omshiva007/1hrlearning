import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { availabilityController } from '../controllers/availability.controller';
import { createAvailabilitySchema, updateAvailabilitySchema } from '@1hrlearning/shared';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const auth = requireAuth as unknown as (req: Request, res: Response, next: NextFunction) => void;

router.use(auth);

router.get('/me', (req, res, next) =>
  availabilityController.getForUser(req as AuthenticatedRequest, res, next),
);
router.get('/:userId', (req, res, next) =>
  availabilityController.getForUser(req as AuthenticatedRequest, res, next),
);
router.post('/', validate(createAvailabilitySchema), (req, res, next) =>
  availabilityController.create(req as AuthenticatedRequest, res, next),
);
router.patch('/:id', validate(updateAvailabilitySchema), (req, res, next) =>
  availabilityController.update(req as AuthenticatedRequest, res, next),
);
router.delete('/:id', (req, res, next) =>
  availabilityController.remove(req as AuthenticatedRequest, res, next),
);

export default router;
