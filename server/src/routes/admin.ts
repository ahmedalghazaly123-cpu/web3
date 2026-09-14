import express, { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { auditLogService, userService, retentionService } from '../services/index.js';

const router = express.Router();

function assertAdminOrOwner(user: any) {
  if (user.role !== Role.ADMIN && user.role !== Role.OWNER) throw new Error('forbidden');
}

router.get('/users', authMiddleware, requireRole([Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const users = await userService.listUsers({
      role: req.query.role as string | undefined,
      search: req.query.search as string | undefined,
    });
    res.json({ users });
  } catch (e: any) {
    console.error('List users error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.get('/users/:id', authMiddleware, requireRole([Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'not-found' });
    res.json({ user });
  } catch (e: any) {
    console.error('Get user error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.put('/users/:id', authMiddleware, requireRole([Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const body = z.object({
      name: z.string().optional(),
      locale: z.string().optional(),
      timezone: z.string().optional(),
      role: z.enum(['STUDENT', 'TEACHER', 'ADMIN', 'OWNER', 'PARENT']).optional(),
    }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'not-found' });
    const actor = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!actor) return res.status(401).json({ error: 'unauthorized' });
    if (actor.role === Role.ADMIN && body.role === Role.OWNER) {
      return res.status(403).json({ error: 'cannot-promote-to-owner' });
    }
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        name: body.name,
        locale: body.locale,
        timezone: body.timezone,
        role: body.role,
      },
      select: { id: true, email: true, name: true, role: true, locale: true, createdAt: true },
    });
    void auditLogService.log({
      action: 'admin.updateUser',
      targetType: 'user',
      targetId: req.params.id,
      actorId: req.userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
      metadata: body,
    });
    res.json({ user: updated });
  } catch (e: any) {
    console.error('Update user error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.delete('/users/:id', authMiddleware, requireRole([Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    if (req.params.id === req.userId) return res.status(400).json({ error: 'cannot-delete-self' });
    await userService.deleteUser(req.params.id);
    void auditLogService.log({
      action: 'admin.deleteUser',
      targetType: 'user',
      targetId: req.params.id,
      actorId: req.userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
    });
    res.json({ ok: true });
  } catch (e: any) {
    console.error('Delete user error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.get('/stats', authMiddleware, requireRole([Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const [userCount, classroomCount, courseCount, assessmentCount, learningEventCount, notificationUnreadCount] = await Promise.all([
      prisma.user.count(),
      prisma.classroom.count(),
      prisma.course.count(),
      prisma.assessment.count(),
      prisma.learningEvent.count(),
      prisma.notification.count({ where: { read: false } }),
    ]);
    res.json({
      userCount, classroomCount, courseCount, assessmentCount,
      learningEventCount, notificationUnreadCount,
    });
  } catch (e) {
    console.error('Stats error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

router.get('/audit-logs', authMiddleware, requireRole([Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const logs = await prisma.auditLog.findMany({
      include: { actor: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json({ logs });
  } catch (e) {
    console.error('Audit logs error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});


// POST /api/v1/admin/retention/run — manual retention sweep (admin/owner only)
router.post('/retention/run', authMiddleware, requireRole([Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const result = await retentionService.runAll();
    void auditLogService.log({
      action: 'admin.retentionRun',
      targetType: 'system',
      actorId: req.userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
      metadata: {
        usersScanned: result.usersScanned,
        usersPurged: result.usersPurged,
        deleted: result.deleted,
        expiredSessionsDeleted: result.expiredSessionsDeleted,
        errors: result.errors.length,
      },
    });
    res.json({ result });
  } catch (e: any) {
    console.error('Retention run error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});
export default router;
