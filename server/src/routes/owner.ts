import express, { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { auditLogService, inviteCodeService } from '../services/index.js';

const router = express.Router();

// ─── Admin invite / security codes (Owner-only) ──────────────────────────────
// The Owner issues codes; Admins must enter a valid code at signup AND at
// every login. The code is stored on the admin account (bcrypt hash).

router.get('/invite-codes', authMiddleware, requireRole([Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const codes = await inviteCodeService.list();
    const admins = await inviteCodeService.listAdminsWithCodes();
    res.json({ codes, admins });
  } catch (e) {
    console.error('List invite codes error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

router.post('/invite-codes', authMiddleware, requireRole([Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const body = z.object({
      code: z.string().trim().min(3).max(64).optional(),
      label: z.string().trim().max(120).optional(),
      maxUses: z.coerce.number().int().min(0).max(100000).default(1),
      expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
    }).parse(req.body);
    const invite = await inviteCodeService.create({
      role: Role.ADMIN,
      code: body.code,
      label: body.label,
      maxUses: body.maxUses,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      createdById: req.userId,
    });
    void auditLogService.log({
      action: 'owner.invite-code.create',
      targetType: 'invite_code',
      targetId: invite.id,
      actorId: req.userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
      metadata: { code: invite.code },
    });
    res.status(201).json({ invite });
  } catch (e: any) {
    if (e?.status === 409) return res.status(409).json({ error: 'code-taken' });
    console.error('Create invite code error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.patch('/invite-codes/:id', authMiddleware, requireRole([Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const body = z.object({
      active: z.boolean().optional(),
      maxUses: z.coerce.number().int().min(0).max(100000).optional(),
      expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
      label: z.string().trim().max(120).nullable().optional(),
    }).parse(req.body);
    const invite = await inviteCodeService.update(req.params.id, {
      active: body.active,
      maxUses: body.maxUses,
      expiresAt: body.expiresAt === undefined ? undefined : body.expiresAt ? new Date(body.expiresAt) : null,
      label: body.label === null ? undefined : body.label,
    });
    void auditLogService.log({
      action: 'owner.invite-code.update',
      targetType: 'invite_code',
      targetId: invite.id,
      actorId: req.userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
      metadata: { active: invite.active },
    });
    res.json({ invite });
  } catch (e: any) {
    console.error('Update invite code error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.delete('/invite-codes/:id', authMiddleware, requireRole([Role.OWNER]), async (req: Request, res: Response) => {
  try {
    await inviteCodeService.remove(req.params.id);
    void auditLogService.log({
      action: 'owner.invite-code.delete',
      targetType: 'invite_code',
      targetId: req.params.id,
      actorId: req.userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
    });
    res.status(204).end();
  } catch (e: any) {
    console.error('Delete invite code error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

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
