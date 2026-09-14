import express, { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { Role } from '@prisma/client';
import { courseService } from '../services/index.js';

const router = express.Router();

const createSchema = z.object({
  title: z.string().min(1).max(200),
  titleAr: z.string().optional(),
  description: z.string().min(1),
  descriptionAr: z.string().optional(),
  instructorId: z.string(),
  instructorName: z.string(),
  instructorNameAr: z.string().optional(),
  instructorAvatar: z.string().default(''),
  category: z.string(),
  categoryAr: z.string().optional(),
  cover: z.string().default(''),
  color: z.string().default('#3b82f6'),
  durationMinutes: z.number().int().min(0),
  totalLessons: z.number().int().min(0),
  published: z.boolean().default(false),
});

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const courses = await courseService.list({
      category: req.query.category as string | undefined,
      published: req.query.published === 'true' ? true : req.query.published === 'false' ? false : undefined,
      instructorId: req.query.instructorId as string | undefined,
    });
    res.json({ courses });
  } catch (e) {
    console.error('List courses error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const course = await courseService.get(req.params.id);
    if (!course) return res.status(404).json({ error: 'not-found' });
    res.json({ course });
  } catch (e) {
    console.error('Get course error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

router.post('/', authMiddleware, requireRole([Role.TEACHER, Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const data = createSchema.parse(req.body);
    const course = await courseService.create(data);
    res.status(201).json({ course });
  } catch (e: any) {
    console.error('Create course error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.put('/:id', authMiddleware, requireRole([Role.TEACHER, Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const course = await courseService.update(req.params.id, req.body);
    res.json({ course });
  } catch (e: any) {
    console.error('Update course error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.delete('/:id', authMiddleware, requireRole([Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    await courseService.remove(req.params.id);
    res.json({ ok: true });
  } catch (e: any) {
    console.error('Delete course error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.post('/:id/enroll', authMiddleware, async (req: Request, res: Response) => {
  try {
    const enrollment = await courseService.enroll(req.params.id, req.userId!);
    res.status(201).json({ enrollment });
  } catch (e: any) {
    console.error('Enroll error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.post('/:id/unenroll', authMiddleware, async (req: Request, res: Response) => {
  try {
    await courseService.unenroll(req.params.id, req.userId!);
    res.json({ ok: true });
  } catch (e: any) {
    console.error('Unenroll error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.get('/:id/enrollments', authMiddleware, async (req: Request, res: Response) => {
  try {
    const enrollments = await courseService.listEnrollments(req.params.id);
    res.json({ enrollments });
  } catch (e) {
    console.error('List enrollments error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

export default router;
