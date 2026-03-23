import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimit';
import { registerSchema, loginSchema, refreshTokenSchema } from '@1hrlearning/shared';
import type { AuthenticatedRequest } from '../types';

const router = Router();

router.post('/register', authRateLimit, validate(registerSchema), authController.register);
router.post('/login', authRateLimit, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);
router.post('/logout', requireAuth as never, (req, res, next) => authController.logout(req as AuthenticatedRequest, res, next));
router.post('/logout-all', requireAuth as never, (req, res, next) => authController.logoutAll(req as AuthenticatedRequest, res, next));
router.get('/me', requireAuth as never, (req, res, next) => authController.me(req as AuthenticatedRequest, res, next));

export default router;
