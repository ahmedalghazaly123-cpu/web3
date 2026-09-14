import express, { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { Role } from '@prisma/client';
import { auditLogService, assignmentService, fileService } from '../services/index.js';

const router = express.Router();

const createSchema = z.object({
  classroomId: z.string().optional(),
  title: z.string().min(1).max(200),
  titleAr: z.string().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  type: z.enum(['HOMEWORK', 'EXAM', 'QUIZ', 'PROJECT', 'READING']).default('HOMEWORK'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']).default('DRAFT'),
  dueAt: z.string().datetime().optional(),
  maxScore: z.number().int().min(0).default(100),
  allowResubmission: z.boolean().default(false),
  lessonId: z.string().optional(),
  courseId: z.string().optional(),
});

router.post('/', authMiddleware, requireRole([Role.TEACHER, Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const teacherId = req.userId!;
    const data = createSchema.parse(req.body);
    const assignment = await assignmentService.create({
      ...data,
      teacherId,
      dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
    });
    res.status(201).json({ assignment });
  } catch (e: any) {
    console.error('Create assignment error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const classroomId = req.query.classroomId as string | undefined;
    const assignments = await assignmentService.list(user!.role as Role, userId, classroomId);
    res.json({ assignments });
  } catch (e) {
    console.error('List assignments error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const assignment = await assignmentService.getDetail(req.params.id, userId);
    if (!assignment) return res.status(404).json({ error: 'not-found' });
    res.json({ assignment });
  } catch (e: any) {
    console.error('Get assignment error:', e);
    res.status(403).json({ error: e?.message ?? 'forbidden' });
  }
});

router.put('/:id', authMiddleware, requireRole([Role.TEACHER, Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const data = createSchema.partial().parse(req.body);
    const assignment = await assignmentService.update(req.params.id, userId, {
      ...data,
      dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
    });
    res.json({ assignment });
  } catch (e: any) {
    console.error('Update assignment error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.post('/:id/publish', authMiddleware, requireRole([Role.TEACHER, Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const assignment = await assignmentService.publish(req.params.id, userId);
    res.json({ assignment });
  } catch (e: any) {
    console.error('Publish error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.delete('/:id', authMiddleware, requireRole([Role.TEACHER, Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    await assignmentService.remove(req.params.id, userId);
    res.json({ ok: true });
  } catch (e: any) {
    console.error('Delete assignment error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.post('/:id/submit', authMiddleware, async (req: Request, res: Response) => {
  try {
    const studentId = req.userId!;
    const body = z.object({
      content: z.string().optional(),
      fileIds: z.array(z.string()).optional(),
      answers: z.any().optional(),
    }).parse(req.body);
    const submission = await assignmentService.submit(req.params.id, studentId, body);
    res.status(201).json({ submission });
  } catch (e: any) {
    console.error('Submit error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.get('/:id/submissions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const submissions = await assignmentService.listSubmissions(req.params.id, userId);
    res.json({ submissions });
  } catch (e: any) {
    console.error('List submissions error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.post('/:id/submissions/:submissionId/grade', authMiddleware, requireRole([Role.TEACHER, Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const teacherId = req.userId!;
    const body = z.object({
      score: z.number().int().min(0),
      feedback: z.string().optional(),
      feedbackAr: z.string().optional(),
    }).parse(req.body);
    const submission = await assignmentService.grade(req.params.submissionId, teacherId, body);
    res.json({ submission });
  } catch (e: any) {
    console.error('Grade error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

export default router;