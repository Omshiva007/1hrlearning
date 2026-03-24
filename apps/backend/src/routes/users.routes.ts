import { Router } from 'express';
import { usersController } from '../controllers/users.controller';
import { skillsController } from '../controllers/skills.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateProfileSchema, addUserSkillSchema, updateUserSkillSchema } from '@1hrlearning/shared';
import type { AuthenticatedRequest } from '../types';
import type { Request, Response, NextFunction } from 'express';

const router = Router();
const auth = requireAuth as unknown as (req: Request, res: Response, next: NextFunction) => void;

router.get('/search', usersController.search);
router.get('/leaderboard', usersController.getLeaderboard);
router.get('/matches', auth, (req, res, next) => usersController.getMatches(req as AuthenticatedRequest, res, next));
router.get('/ad-preferences', auth, (req, res, next) => usersController.getAdPreferences(req as AuthenticatedRequest, res, next));
router.patch('/ad-preferences', auth, (req, res, next) => usersController.updateAdPreferences(req as AuthenticatedRequest, res, next));
router.get('/username/:username', usersController.getByUsername);
router.get('/:id', usersController.getById);
router.put('/me', auth, validate(updateProfileSchema), (req, res, next) => usersController.updateProfile(req as AuthenticatedRequest, res, next));
router.delete('/me', auth, (req, res, next) => usersController.deactivateAccount(req as AuthenticatedRequest, res, next));

// User skills routes
router.get('/:userId/skills', skillsController.listUserSkills);
router.post('/:userId/skills', auth, validate(addUserSkillSchema), (req, res, next) => skillsController.addUserSkill(req as unknown as AuthenticatedRequest, res, next));
router.put('/:userId/skills/:skillId', auth, validate(updateUserSkillSchema), (req, res, next) => skillsController.updateUserSkill(req as unknown as AuthenticatedRequest, res, next));
router.delete('/:userId/skills/:skillId', auth, (req, res, next) => skillsController.removeUserSkill(req as unknown as AuthenticatedRequest, res, next));

export default router;
