import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createSkillSchema, updateSkillSchema } from '@1hrlearning/shared';
import { adminController } from '../controllers/admin.controller';
import type { AuthenticatedRequest } from '../types';

const router = Router();

const auth = requireAuth as unknown as (req: Request, res: Response, next: NextFunction) => void;
const adminOnly = requireRole('ADMIN') as unknown as (req: Request, res: Response, next: NextFunction) => void;

// All admin routes require authentication and ADMIN role
router.use(auth, adminOnly);

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard', (req, res, next) =>
  adminController.getDashboard(req as AuthenticatedRequest, res, next),
);

// ── Skills ────────────────────────────────────────────────────────────────────
router.get('/skills', (req, res, next) =>
  adminController.listSkills(req as AuthenticatedRequest, res, next),
);
router.post('/skills', validate(createSkillSchema), (req, res, next) =>
  adminController.createSkill(req as AuthenticatedRequest, res, next),
);
router.put('/skills/:id', validate(updateSkillSchema), (req, res, next) =>
  adminController.updateSkill(req as unknown as AuthenticatedRequest, res, next),
);
router.delete('/skills/:id', (req, res, next) =>
  adminController.deleteSkill(req as unknown as AuthenticatedRequest, res, next),
);

// ── Categories ────────────────────────────────────────────────────────────────
router.get('/categories', (req, res, next) =>
  adminController.listCategories(req as AuthenticatedRequest, res, next),
);

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/users', (req, res, next) =>
  adminController.listUsers(req as AuthenticatedRequest, res, next),
);
router.get('/users/:id', (req, res, next) =>
  adminController.getUserById(req as unknown as AuthenticatedRequest, res, next),
);
router.patch('/users/:id/role', (req, res, next) =>
  adminController.updateUserRole(req as unknown as AuthenticatedRequest, res, next),
);
router.patch('/users/:id/status', (req, res, next) =>
  adminController.updateUserStatus(req as unknown as AuthenticatedRequest, res, next),
);

export default router;
