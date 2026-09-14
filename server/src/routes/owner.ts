import express, { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { auditLogService } from '../services/index.js';

const router = express.Router();

// Owner-only: promote user to OWNER
router.post('/users/:id/role', authMiddleware, requireRole([Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const body = z.object({ role: z.enum(['STUDENT', 'TEACHER', 'ADMIN', 'OWNER', 'PARENT']) }).parse(req.body);
    if (req.params.id === req.userId && body.role !== Role.OWNER) {
      return res.status(400).json({ error: 'cannot-demotion-self' });
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role: body.role },
      select: { id: true, email: true, name: true, role: true, locale: true, createdAt: true },
    });
    void auditLogService.log({
      action: 'owner.changeRole',
      targetType: 'user',
      targetId: req.params.id,
      actorId: req.userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
      metadata: { newRole: body.role },
    });
    res.json({ user });
  } catch (e: any) {
    console.error('Change role error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

// Owner-only: manage feature flags
router.get('/feature-flags', authMiddleware, requireRole([Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const flags = await prisma.featureFlag.findMany();
    res.json({ flags });
  } catch (e) {
    console.error('List flags error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

router.put('/feature-flags/:key', authMiddleware, requireRole([Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const body = z.object({
      enabled: z.boolean(),
      roles: z.array(z.string()).optional(),
      minEnv: z.string().optional(),
    }).parse(req.body);
    const flag = await prisma.featureFlag.upsert({
      where: { key: req.params.key },
      update: { enabled: body.enabled, roles: body.roles ?? [], minEnv: body.minEnv, updatedAt: new Date() },
      create: { key: req.params.key, enabled: body.enabled, roles: body.roles ?? [], minEnv: body.minEnv },
    });
    res.json({ flag });
  } catch (e: any) {
    console.error('Update flag error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

// Owner-only: AI gateway policy
router.get('/ai-gateway-policy', authMiddleware, requireRole([Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const policy = await prisma.aiGatewayPolicy.findFirst();
    res.json({ policy });
  } catch (e) {
    console.error('Get policy error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

router.put('/ai-gateway-policy/:id', authMiddleware, requireRole([Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const body = z.object({
      semanticCacheEnabled: z.boolean().optional(),
      budgetUsdMonthly: z.number().optional(),
      budgetAlertThreshold: z.number().int().optional(),
      rateLimitRequestsPerMinute: z.number().int().optional(),
      piiRedactionEnabled: z.boolean().optional(),
      unsafeBlockEnabled: z.boolean().optional(),
      academicIntegrityDefaultMode: z.enum(['EXPLAIN', 'HINT', 'SOCRATIC', 'STEP_BY_STEP', 'EXAM_PREP', 'REVISION', 'ERROR_EXPLANATION', 'FULL_SOLUTION', 'GUIDED_SOLUTION', 'ASSIST']).optional(),
    }).parse(req.body);
    const policy = await prisma.aiGatewayPolicy.update({ where: { id: req.params.id }, data: body });
    res.json({ policy });
  } catch (e: any) {
    console.error('Update policy error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

// Owner-only: organizations
router.get('/organizations', authMiddleware, requireRole([Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const orgs = await prisma.organization.findMany({ orderBy: { createdAt: 'asc' } });
    const orgRows = await prisma.user.groupBy({ by: ['organizationId'], _count: { _all: true } });
    const userCounts: Record<string, number> = {};
    for (const row of orgRows) {
      if (row.organizationId) userCounts[row.organizationId] = row._count._all;
    }
    const organizations = orgs.map((o) => ({ ...o, userCount: userCounts[o.id] ?? 0 }));
    res.json({ organizations: orgs });
  } catch (e) {
    console.error('List orgs error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

router.post('/organizations', authMiddleware, requireRole([Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const body = z.object({
      name: z.string().min(1),
      nameAr: z.string().optional(),
      slug: z.string().min(1),
      tiers: z.array(z.string()).default([]),
    }).parse(req.body);
    const org = await prisma.organization.create({ data: body });
    res.status(201).json({ organization: org });
  } catch (e: any) {
    console.error('Create org error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

export default router;
