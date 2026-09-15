import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { sandboxService, auditLogService } from '../services/index.js';

const router = Router();

const languageSchema = z
  .enum(['js', 'javascript', 'node', 'js-node', 'python', 'python3', 'py'])
  .transform((v) => (v.startsWith('p') ? ('PYTHON' as const) : ('JS' as const)));

const runSchema = z.object({
  language: languageSchema.default('js'),
  code: z.string().min(1),
  timeoutMs: z.number().int().positive().optional(),
  stdin: z.string().optional(),
});

/** Static guard only — never executes. Used by the client to pre-flight code. */
router.post('/validate', authMiddleware, (req: Request, res: Response) => {
  try {
    const body = runSchema.parse(req.body);
    const verdict = sandboxService.validateInput(body);
    res.json({ allowed: verdict.allowed, reason: verdict.reason ?? 'Static checks passed.' });
  } catch (e: any) {
    res.status(400).json({ allowed: false, reason: e?.message ?? 'validation' });
  }
});

/**
 * POST /api/v1/sandbox/run — execute code in the sandbox.
 * The run row is created first (PENDING) so the execution is auditable even if
 * the process dies mid-run, then the result is persisted.
 */
router.post('/run', authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = runSchema.parse(req.body);
    const verdict = sandboxService.validateInput(body);
    const { runId } = await sandboxService.createRun(body, req.userId!);

    const output = verdict.allowed
      ? await sandboxService.execute(body)
      : { status: 'REJECTED' as const, stdout: [], stderr: verdict.reason ?? 'rejected', durationMs: 0 };

    await sandboxService.recordRunResult(runId, output);

    void auditLogService.log({
      action: 'sandbox.run',
      targetType: 'sandbox_run',
      targetId: runId,
      actorId: req.userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
      metadata: {
        language: body.language,
        status: output.status,
        codeLength: body.code.length,
        blocked: !verdict.allowed,
      },
    });

    res.status(201).json({
      run: {
        id: runId,
        status: output.status,
        stdout: output.stdout,
        stderr: output.stderr,
        result: output.result,
        durationMs: output.durationMs,
        timedOut: output.status === 'TIMEOUT',
        accepted: verdict.allowed,
        reason: verdict.allowed ? undefined : verdict.reason,
      },
    });
  } catch (e: any) {
    console.error('Sandbox run error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

/** GET /api/v1/sandbox/runs — the caller's own run history (newest first). */
router.get('/runs', authMiddleware, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const runs = await sandboxService.listRuns(req.userId!, limit);
    res.json({ runs });
  } catch (e: any) {
    console.error('Sandbox list error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

/** GET /api/v1/sandbox/runs/:id — one run, ownership enforced. */
router.get('/runs/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const run = await sandboxService.getRun(req.params.id, req.userId!);
    res.json({ run });
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    if (msg === 'forbidden') return res.status(403).json({ error: 'forbidden' });
    res.status(404).json({ error: msg || 'not-found' });
  }
});

export default router;
