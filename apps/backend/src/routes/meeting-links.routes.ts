import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createMeetingLinkSchema } from '@1hrlearning/shared';
import { prisma } from '../utils/prisma';
import { AppError } from '../types';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const auth = requireAuth as unknown as (req: Request, res: Response, next: NextFunction) => void;

router.use(auth);

// GET /meeting-links — list saved links for current user
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const links = await prisma.savedMeetingLink.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: links });
  } catch (error) {
    next(error);
  }
});

// POST /meeting-links — create a saved link
router.post('/', validate(createMeetingLinkSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const { label, url, provider } = req.body as { label: string; url: string; provider: string };

    const count = await prisma.savedMeetingLink.count({ where: { userId } });
    if (count >= 10) throw new AppError('Maximum 10 meeting links allowed', 400);

    const link = await prisma.savedMeetingLink.create({
      data: { userId, label, url, provider: (provider as never) ?? 'CUSTOM' },
    });
    res.status(201).json({ success: true, data: link });
  } catch (error) {
    next(error);
  }
});

// DELETE /meeting-links/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const link = await prisma.savedMeetingLink.findUnique({ where: { id: req.params.id } });
    if (!link) throw new AppError('Meeting link not found', 404);
    if (link.userId !== userId) throw new AppError('Access denied', 403);
    await prisma.savedMeetingLink.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Meeting link deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
