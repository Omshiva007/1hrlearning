import { Router } from 'express';
import { usersController } from '../controllers/users.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateProfileSchema } from '@1hrlearning/shared';
import type { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/search', usersController.search);
router.get('/leaderboard', usersController.getLeaderboard);
router.get('/matches', requireAuth as never, (req, res, next) => usersController.getMatches(req as AuthenticatedRequest, res, next));
router.get('/username/:username', usersController.getByUsername);
router.get('/:id', usersController.getById);
router.put('/me', requireAuth as never, validate(updateProfileSchema), (req, res, next) => usersController.updateProfile(req as AuthenticatedRequest, res, next));
router.delete('/me', requireAuth as never, (req, res, next) => usersController.deactivateAccount(req as AuthenticatedRequest, res, next));

export default router;
