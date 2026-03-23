import { Router } from 'express';
import { connectionsController } from '../controllers/connections.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createConnectionSchema, updateConnectionSchema } from '@1hrlearning/shared';
import type { AuthenticatedRequest } from '../types';

const router = Router();

const auth = requireAuth as never;
const wrap = (fn: (req: AuthenticatedRequest, res: never, next: never) => Promise<void>) =>
  (req: never, res: never, next: never) => fn(req as AuthenticatedRequest, res, next);

router.get('/', auth, wrap(connectionsController.list));
router.post('/', auth, validate(createConnectionSchema), wrap(connectionsController.create));
router.patch('/:id', auth, validate(updateConnectionSchema), wrap(connectionsController.update));

export default router;
