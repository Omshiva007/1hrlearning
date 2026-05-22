import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { adminController } from '../controllers/admin.controller';
import {
  createSkillSchema,
  updateSkillSchema,
  adminSuspendUserSchema,
  adminBanUserSchema,
  adminPointAdjustSchema,
  updatePointConfigSchema,
  updatePlatformConfigSchema,
  createAdSchema,
  updateAdSchema,
  adminSessionOverrideSchema,
  resolveFlagSchema,
} from '@1hrlearning/shared';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const auth = requireAuth as unknown as (req: Request, res: Response, next: NextFunction) => void;
const adminOnly = requireRole('ADMIN') as unknown as (req: Request, res: Response, next: NextFunction) => void;
const moderatorPlus = requireRole('MODERATOR') as unknown as (req: Request, res: Response, next: NextFunction) => void;

router.use(auth);

// ── Dashboard (all roles) ─────────────────────────────────────────────────────
router.get('/dashboard', moderatorPlus, (req, res, next) =>
  adminController.getDashboard(req as AuthenticatedRequest, res, next),
);

// ── Skills (admin only) ───────────────────────────────────────────────────────
router.get('/skills', adminOnly, (req, res, next) =>
  adminController.listSkills(req as AuthenticatedRequest, res, next),
);
router.post('/skills', adminOnly, validate(createSkillSchema), (req, res, next) =>
  adminController.createSkill(req as AuthenticatedRequest, res, next),
);
router.put('/skills/:id', adminOnly, validate(updateSkillSchema), (req, res, next) =>
  adminController.updateSkill(req as unknown as AuthenticatedRequest, res, next),
);
router.delete('/skills/:id', adminOnly, (req, res, next) =>
  adminController.deleteSkill(req as unknown as AuthenticatedRequest, res, next),
);

// ── Categories (moderator+) ───────────────────────────────────────────────────
router.get('/categories', moderatorPlus, (req, res, next) =>
  adminController.listCategories(req as AuthenticatedRequest, res, next),
);

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/users', moderatorPlus, (req, res, next) =>
  adminController.listUsers(req as AuthenticatedRequest, res, next),
);
router.get('/users/:id', moderatorPlus, (req, res, next) =>
  adminController.getUserById(req as unknown as AuthenticatedRequest, res, next),
);
router.patch('/users/:id/role', adminOnly, (req, res, next) =>
  adminController.updateUserRole(req as unknown as AuthenticatedRequest, res, next),
);
router.patch('/users/:id/status', adminOnly, (req, res, next) =>
  adminController.updateUserStatus(req as unknown as AuthenticatedRequest, res, next),
);
router.post('/users/:id/suspend', moderatorPlus, validate(adminSuspendUserSchema), (req, res, next) =>
  adminController.suspendUser(req as unknown as AuthenticatedRequest, res, next),
);
router.post('/users/:id/ban', adminOnly, validate(adminBanUserSchema), (req, res, next) =>
  adminController.banUser(req as unknown as AuthenticatedRequest, res, next),
);
router.post('/users/:id/reinstate', adminOnly, (req, res, next) =>
  adminController.reinstateUser(req as unknown as AuthenticatedRequest, res, next),
);
router.post('/users/:id/points', moderatorPlus, validate(adminPointAdjustSchema), (req, res, next) =>
  adminController.adjustUserPoints(req as unknown as AuthenticatedRequest, res, next),
);

// ── Sessions ──────────────────────────────────────────────────────────────────
router.get('/sessions', moderatorPlus, (req, res, next) =>
  adminController.listSessions(req as AuthenticatedRequest, res, next),
);
router.get('/sessions/:id', moderatorPlus, (req, res, next) =>
  adminController.getSessionById(req as unknown as AuthenticatedRequest, res, next),
);
router.post('/sessions/:id/override', adminOnly, validate(adminSessionOverrideSchema), (req, res, next) =>
  adminController.overrideSession(req as unknown as AuthenticatedRequest, res, next),
);

// ── Point Config ──────────────────────────────────────────────────────────────
router.get('/points/config', adminOnly, (req, res, next) =>
  adminController.getPointConfig(req as AuthenticatedRequest, res, next),
);
router.patch('/points/config', adminOnly, validate(updatePointConfigSchema), (req, res, next) =>
  adminController.updatePointConfig(req as AuthenticatedRequest, res, next),
);
router.get('/points/economy', moderatorPlus, (req, res, next) =>
  adminController.getPointEconomyHealth(req as AuthenticatedRequest, res, next),
);

// ── Analytics ─────────────────────────────────────────────────────────────────
router.get('/analytics', moderatorPlus, (req, res, next) =>
  adminController.getAnalytics(req as AuthenticatedRequest, res, next),
);

// ── Moderation ────────────────────────────────────────────────────────────────
router.get('/moderation/flags', moderatorPlus, (req, res, next) =>
  adminController.listFlags(req as AuthenticatedRequest, res, next),
);
router.patch('/moderation/flags/:id/resolve', moderatorPlus, validate(resolveFlagSchema), (req, res, next) =>
  adminController.resolveFlag(req as unknown as AuthenticatedRequest, res, next),
);

// ── Platform Config ───────────────────────────────────────────────────────────
router.get('/config', adminOnly, (req, res, next) =>
  adminController.getPlatformConfig(req as AuthenticatedRequest, res, next),
);
router.patch('/config', adminOnly, validate(updatePlatformConfigSchema), (req, res, next) =>
  adminController.updatePlatformConfig(req as AuthenticatedRequest, res, next),
);

// ── Audit Log ─────────────────────────────────────────────────────────────────
router.get('/audit-log', adminOnly, (req, res, next) =>
  adminController.getAuditLog(req as AuthenticatedRequest, res, next),
);

// ── Ads ───────────────────────────────────────────────────────────────────────
router.get('/ads', adminOnly, (req, res, next) =>
  adminController.listAds(req as AuthenticatedRequest, res, next),
);
router.post('/ads', adminOnly, validate(createAdSchema), (req, res, next) =>
  adminController.createAd(req as AuthenticatedRequest, res, next),
);
router.patch('/ads/:id', adminOnly, validate(updateAdSchema), (req, res, next) =>
  adminController.updateAd(req as unknown as AuthenticatedRequest, res, next),
);
router.delete('/ads/:id', adminOnly, (req, res, next) =>
  adminController.deleteAd(req as unknown as AuthenticatedRequest, res, next),
);

// ── Background Jobs (admin only) ──────────────────────────────────────────────
router.post('/jobs/run-emails', adminOnly, (req, res, next) => {
  const { backgroundJobsService } = require('../services/background-jobs.service');
  Promise.all([
    backgroundJobsService.sendOnboardingReminders(),
    backgroundJobsService.sendPointsExpiryWarnings(),
    backgroundJobsService.sendReEngagementEmails(),
  ])
    .then(([onboarding, expiry, reengagement]) => {
      res.json({
        success: true,
        message: 'Email jobs completed',
        data: {
          onboardingReminders: onboarding,
          expiryWarnings: expiry,
          reengagementEmails: reengagement,
        },
      });
    })
    .catch((error) => next(error));
});

router.post('/jobs/run-sessions', adminOnly, (req, res, next) => {
  const { sessionsService } = require('../services/sessions.service');
  const { backgroundJobsService } = require('../services/background-jobs.service');
  Promise.all([
    sessionsService.autoCompletePastSessions(),
    backgroundJobsService.expireStalePoints(),
  ])
    .then(([completed, expired]) => {
      res.json({
        success: true,
        message: 'Session jobs completed',
        data: {
          completedSessions: completed,
          expiredPoints: expired,
        },
      });
    })
    .catch((error) => next(error));
});

export default router;
