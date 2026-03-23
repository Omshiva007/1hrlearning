import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import { skillsService } from '../services/skills.service';

export const skillsController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await skillsService.listSkills(req.query as never);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const skill = await skillsService.getSkillById(req.params.id);
      res.json({ success: true, data: skill });
    } catch (error) {
      next(error);
    }
  },

  async getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const skill = await skillsService.getSkillBySlug(req.params.slug);
      res.json({ success: true, data: skill });
    } catch (error) {
      next(error);
    }
  },

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const skill = await skillsService.createSkill(req.body);
      res.status(201).json({ success: true, data: skill });
    } catch (error) {
      next(error);
    }
  },

  async addUserSkill(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userSkill = await skillsService.addUserSkill(req.user.id, req.body);
      res.status(201).json({ success: true, data: userSkill });
    } catch (error) {
      next(error);
    }
  },

  async removeUserSkill(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await skillsService.removeUserSkill(req.user.id, req.params.skillId);
      res.json({ success: true, message: 'Skill removed' });
    } catch (error) {
      next(error);
    }
  },

  async getTeachers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await skillsService.getTeachersForSkill(
        req.params.id,
        Number(page),
        Number(limit),
      );
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },
};
