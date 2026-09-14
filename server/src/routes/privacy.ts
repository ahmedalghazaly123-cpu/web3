// Privacy / Consent API (Wave 2)
// Authenticated user-scoped endpoints for consent, preferences, data export,
// and data deletion. Ownership is enforced by deriving the user ID from the
// authenticated session — never from request params/body.
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { privacyService } from '../services/privacyService.js';
import { auditLogService } from '../services/index.js';

const router = Router();

function requireSelfOnly(req: Request, res: Response, next: Function) {
  if (!req.userId) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// GET /api/v1/privacy/consents — list own consent state
router.get('/consents', authMiddleware, requireSelfOnly, async (req: Request, res: Response) => {
  try {
    const consents = await privacyService.getConsents(req.userId!);
    res.json({ consents });
  } catch (e: any) {
    console.error('Consents error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

// PUT /api/v1/privacy/consents/:category — update own consent
router.put('/consents/:category', authMiddleware, requireSelfOnly, async (req: Request, res: Response) => {
  try {
    const body = z.object({ granted: z.boolean(), policyVersion: z.string().optional() }).parse(req.body);
    const consent = await privacyService.setConsent(
      req.userId!,
      req.params.category,
      body.granted,
      body.policyVersion,
    );
    void auditLogService.log({
      action: body.granted ? 'consent.granted' : 'consent.revoked',
      targetType: 'consent',
      actorId: req.userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
      metadata: { category: req.params.category, granted: body.granted, policyVersion: body.policyVersion },
    });
    res.json({ consent });
  } catch (e: any) {
    console.error('Set consent error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

// DELETE /api/v1/privacy/consents/:category — revoke own consent
router.delete('/consents/:category', authMiddleware, requireSelfOnly, async (req: Request, res: Response) => {
  try {
    const consent = await privacyService.revokeConsent(req.userId!, req.params.category);
    void auditLogService.log({
      action: 'consent.revoked',
      targetType: 'consent',
      actorId: req.userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
      metadata: { category: req.params.category, granted: false },
    });
    res.json({ consent });
  } catch (e: any) {
    console.error('Revoke consent error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

// GET /api/v1/privacy/preferences — get own privacy preferences
router.get('/preferences', authMiddleware, requireSelfOnly, async (req: Request, res: Response) => {
  try {
    const prefs = await privacyService.getPreferences(req.userId!);
    res.json({ preferences: prefs });
  } catch (e: any) {
    console.error('Preferences error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

// PUT /api/v1/privacy/preferences — update own privacy preferences
router.put('/preferences', authMiddleware, requireSelfOnly, async (req: Request, res: Response) => {
  try {
    const body = z
      .object({
        dataExportEnabled: z.boolean().optional(),
        dataDeletionEnabled: z.boolean().optional(),
        analyticsOptIn: z.boolean().optional(),
        aiProcessingOptIn: z.boolean().optional(),
        retentionDays: z.number().int().positive().nullable().optional(),
      })
      .parse(req.body);
    const prefs = await privacyService.updatePreferences(req.userId!, body);
    void auditLogService.log({
      action: 'privacy.preferencesUpdated',
      targetType: 'privacy_preference',
      actorId: req.userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
      metadata: body,
    });
    res.json({ preferences: prefs });
  } catch (e: any) {
    console.error('Update preferences error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

// GET /api/v1/privacy/export — export own data (ownership protected)
router.get('/export', authMiddleware, requireSelfOnly, async (req: Request, res: Response) => {
  try {
    const data = await privacyService.exportUserData(req.userId!);
    void auditLogService.log({
      action: 'privacy.export',
      targetType: 'user',
      targetId: req.userId,
      actorId: req.userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
    });
    res.json({ data });
  } catch (e: any) {
    console.error('Export error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

// DELETE /api/v1/privacy/account — delete own account (ownership protected)
router.delete('/account', authMiddleware, requireSelfOnly, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'not-found' });
    await privacyService.deleteUserData(req.userId!);
    void auditLogService.log({
      action: 'privacy.accountDeleted',
      targetType: 'user',
      targetId: req.userId,
      actorId: req.userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
    });
    res.json({ ok: true, deleted: true });
  } catch (e: any) {
    console.error('Delete account error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

export default router;