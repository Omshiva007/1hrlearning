import { Router } from 'express';
import { skillsController } from '../controllers/skills.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createSkillSchema, addUserSkillSchema } from '@1hrlearning/shared';
import type { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/', skillsController.list);
router.get('/slug/:slug', skillsController.getBySlug);
router.get('/:id', skillsController.getById);
router.get('/:id/teachers', skillsController.getTeachers);
router.post('/', requireAuth as never, validate(createSkillSchema), (req, res, next) => skillsController.create(req as AuthenticatedRequest, res, next));
router.post('/user', requireAuth as never, validate(addUserSkillSchema), (req, res, next) => skillsController.addUserSkill(req as AuthenticatedRequest, res, next));
router.delete('/user/:skillId', requireAuth as never, (req, res, next) => skillsController.removeUserSkill(req as AuthenticatedRequest, res, next));

export default router;
