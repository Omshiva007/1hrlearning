import { Router } from 'express';
import type { Request, Response } from 'express';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import skillsRoutes from './skills.routes';
import sessionsRoutes from './sessions.routes';
import connectionsRoutes from './connections.routes';
import notificationsRoutes from './notifications.routes';
import pointsRoutes from './points.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/skills', skillsRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/connections', connectionsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/points', pointsRoutes);

router.get('/csrf-token', (req: Request, res: Response) => {
  res.json({ csrfToken: req.csrfToken() });
});

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
