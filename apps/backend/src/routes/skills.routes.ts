import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { skillsController } from '../controllers/skills.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createSkillSchema, addUserSkillSchema, skillQuerySchema } from '@1hrlearning/shared';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const auth = requireAuth as unknown as (req: Request, res: Response, next: NextFunction) => void;

router.get('/', validate(skillQuerySchema, 'query'), skillsController.list);
router.get('/slug/:slug', skillsController.getBySlug);
router.get('/:id', skillsController.getById);
router.get('/:id/teachers', skillsController.getTeachers);
router.post('/', auth, validate(createSkillSchema), (req, res, next) => skillsController.create(req as unknown as AuthenticatedRequest, res, next));
router.post('/user', auth, validate(addUserSkillSchema), (req, res, next) => skillsController.addUserSkill(req as unknown as AuthenticatedRequest, res, next));
router.delete('/user/:skillId', auth, (req, res, next) => skillsController.removeUserSkill(req as unknown as AuthenticatedRequest, res, next));

export default router;
