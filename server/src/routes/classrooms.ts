import express, { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { auditLogService, notificationService, classroomService } from '../services/index.js';

const router = express.Router();

const createSchema = z.object({
  title: z.string().min(1).max(120),
  titleAr: z.string().optional(),
  courseId: z.string().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});

// Teacher/Admin/Owner: create classroom
router.post('/', authMiddleware, requireRole([Role.TEACHER, Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const teacherId = req.userId!;
    const data = createSchema.parse(req.body);
    const classroom = await classroomService.create({
      teacherId,
      title: data.title,
      titleAr: data.titleAr,
      courseId: data.courseId,
      status: data.status,
    });
    void auditLogService.log({
      action: 'classroom.create',
      targetType: 'classroom',
      targetId: classroom.id,
      actorId: teacherId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
    });
    res.status(201).json({ classroom });
  } catch (e: any) {
    console.error('Create classroom error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

// Teacher/Admin/Owner: list classrooms (admin/owner see all; teacher sees own)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const classrooms = await classroomService.list(user!.role as Role, userId);
    res.json({ classrooms });
  } catch (e) {
    console.error('List classrooms error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

// Teacher/Admin/Owner: get classroom detail with students
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const classroom = await classroomService.getDetail(req.params.id, userId);
    if (!classroom) return res.status(404).json({ error: 'not-found' });
    res.json({ classroom });
  } catch (e: any) {
    console.error('Get classroom error:', e);
    res.status(403).json({ error: e?.message ?? 'forbidden' });
  }
});

// Teacher/Admin/Owner: update classroom
router.put('/:id', authMiddleware, requireRole([Role.TEACHER, Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const data = createSchema.partial().parse(req.body);
    const classroom = await classroomService.update(req.params.id, userId, data);
    res.json({ classroom });
  } catch (e: any) {
    console.error('Update classroom error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

// Teacher/Admin/Owner: archive/delete classroom
router.delete('/:id', authMiddleware, requireRole([Role.TEACHER, Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    await classroomService.remove(req.params.id, userId);
    void auditLogService.log({
      action: 'classroom.delete',
      targetType: 'classroom',
      targetId: req.params.id,
      actorId: userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
    });
    res.json({ ok: true });
  } catch (e: any) {
    console.error('Delete classroom error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

// Teacher/Admin/Owner: add student by email
router.post('/:id/students', authMiddleware, requireRole([Role.TEACHER, Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const teacherId = req.userId!;
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const membership = await classroomService.addStudent(req.params.id, email, teacherId);
    res.status(201).json({ membership });
  } catch (e: any) {
    console.error('Add student error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

// Teacher/Admin/Owner: remove student
router.delete('/:id/students/:studentId', authMiddleware, requireRole([Role.TEACHER, Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const teacherId = req.userId!;
    await classroomService.removeStudent(req.params.id, req.params.studentId, teacherId);
    res.json({ ok: true });
  } catch (e: any) {
    console.error('Remove student error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

// Student: join classroom by invite code
router.post('/:id/join', authMiddleware, async (req: Request, res: Response) => {
  try {
    const studentId = req.userId!;
    const membership = await classroomService.join(req.params.id, studentId);
    res.status(201).json({ membership });
  } catch (e: any) {
    console.error('Join classroom error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

// Student: leave classroom
router.post('/:id/leave', authMiddleware, async (req: Request, res: Response) => {
  try {
    const studentId = req.userId!;
    await classroomService.leave(req.params.id, studentId);
    res.json({ ok: true });
  } catch (e: any) {
    console.error('Leave classroom error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

// Teacher/Admin/Owner: classroom analytics
router.get('/:id/analytics', authMiddleware, requireRole([Role.TEACHER, Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const analytics = await classroomService.analytics(req.params.id, userId);
    res.json({ analytics });
  } catch (e: any) {
    console.error('Analytics error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

export default router;