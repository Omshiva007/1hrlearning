import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createTestimonialSchema } from '@1hrlearning/shared';
import { sessionsService } from '../services/sessions.service';
import { prisma } from '../utils/prisma';
import { AppError } from '../types';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const auth = requireAuth as unknown as (req: Request, res: Response, next: NextFunction) => void;

// GET /testimonials/user/:userId — public testimonials for a user profile
router.get('/user/:userId', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(50, parseInt(req.query.limit as string || '10', 10));
    const result = await sessionsService.getTestimonialsForUser(req.params.userId, page, limit);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// POST /testimonials/sessions/:sessionId — leave testimonial (learner only, auth required)
router.post(
  '/sessions/:sessionId',
  auth,
  validate(createTestimonialSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const testimonial = await sessionsService.createTestimonial(
        req.params.sessionId,
        (req as AuthenticatedRequest).user.id,
        req.body,
      );
      res.status(201).json({ success: true, data: testimonial });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /testimonials/:id — author removes their own testimonial
router.delete('/:id', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const testimonial = await prisma.testimonial.findUnique({ where: { id: req.params.id } });
    if (!testimonial) throw new AppError('Testimonial not found', 404);
    if (testimonial.authorId !== userId) throw new AppError('Access denied', 403);
    await prisma.testimonial.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Testimonial deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
