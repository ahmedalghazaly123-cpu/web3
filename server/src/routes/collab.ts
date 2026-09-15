import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { collabService, auditLogService } from '../services/index.js';

const router = Router();

const createRoomSchema = z.object({
  kind: z.enum(['study', 'quiz-battle', 'code-battle', 'classroom']).default('study'),
  title: z.string().min(1).max(120),
  courseId: z.string().optional(),
  privacy: z.enum(['public', 'private', 'invite-only']).default('invite-only'),
  language: z.enum(['en', 'ar']).optional(),
});

const messageSchema = z.object({
  content: z.string().min(1).max(1000),
  kind: z.enum(['CHAT', 'SYSTEM', 'SCORE']).default('CHAT'),
});

/** Map service errors to HTTP codes (same vocabulary as files/learning routes). */
function fail(res: Response, e: unknown) {
  const msg = String((e as Error)?.message ?? 'validation');
  if (msg === 'forbidden') return res.status(403).json({ error: 'forbidden' });
  if (msg === 'not-found') return res.status(404).json({ error: 'not-found' });
  if (msg === 'room-closed' || msg === 'invalid-code') return res.status(409).json({ error: msg });
  return res.status(400).json({ error: msg });
}

/** POST /api/v1/collab/rooms — create a room (creator becomes HOST). */
router.post('/rooms', authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = createRoomSchema.parse(req.body);
    const room = await collabService.create(req.userId!, body);
    void auditLogService.log({
      action: 'collab.roomCreated',
      targetType: 'live_room',
      targetId: room.id,
      actorId: req.userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
      metadata: { kind: body.kind, privacy: body.privacy },
    });
    res.status(201).json({ room });
  } catch (e) {
    fail(res, e);
  }
});

/** GET /api/v1/collab/rooms?kind=&status=&limit= — discoverable rooms. */
router.get('/rooms', authMiddleware, async (req: Request, res: Response) => {
  try {
    const rooms = await collabService.list({
      kind: req.query.kind as string | undefined,
      status: req.query.status as string | undefined,
      limit: Math.min(Number(req.query.limit) || 20, 100),
    });
    res.json({ rooms });
  } catch (e) {
    fail(res, e);
  }
});

/** GET /api/v1/collab/rooms/:id — room detail with members. */
router.get('/rooms/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const room = await collabService.get(req.params.id, req.userId!);
    res.json({ room });
  } catch (e) {
    fail(res, e);
  }
});

/** POST /api/v1/collab/rooms/:id/join — { code?, name? } */
router.post('/rooms/:id/join', authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = z
      .object({ code: z.string().max(16).optional(), name: z.string().max(80).optional() })
      .parse(req.body ?? {});
    const room = await collabService.join(req.params.id, req.userId!, body);
    res.json({ room });
  } catch (e) {
    fail(res, e);
  }
});

/** POST /api/v1/collab/rooms/:id/start — host only. */
router.post('/rooms/:id/start', authMiddleware, async (req: Request, res: Response) => {
  try {
    const room = await collabService.start(req.params.id, req.userId!);
    void auditLogService.log({
      action: 'collab.roomStarted',
      targetType: 'live_room',
      targetId: req.params.id,
      actorId: req.userId,
      ipAddress: req.ip,
    });
    res.json({ room });
  } catch (e) {
    fail(res, e);
  }
});

/** POST /api/v1/collab/rooms/:id/award — { userId, points } (host only). */
router.post('/rooms/:id/award', authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = z
      .object({ userId: z.string().min(1), points: z.number().int().min(-1000).max(1000) })
      .parse(req.body);
    const result = await collabService.award(req.params.id, body.userId, body.points, req.userId!);
    res.json(result);
  } catch (e) {
    fail(res, e);
  }
});

/** POST /api/v1/collab/rooms/:id/finish — host only; ranks members and closes. */
router.post('/rooms/:id/finish', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await collabService.finish(req.params.id, req.userId!);
    void auditLogService.log({
      action: 'collab.roomFinished',
      targetType: 'live_room',
      targetId: req.params.id,
      actorId: req.userId,
      ipAddress: req.ip,
      metadata: { winner: result.winner, members: result.leaderboard.length },
    });
    res.json(result);
  } catch (e) {
    fail(res, e);
  }
});

/** GET /api/v1/collab/rooms/:id/messages — members only. */
router.get('/rooms/:id/messages', authMiddleware, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const messages = await collabService.listMessages(req.params.id, req.userId!, limit);
    res.json({ messages });
  } catch (e) {
    fail(res, e);
  }
});

/** POST /api/v1/collab/rooms/:id/messages — { content, kind? } (members only). */
router.post('/rooms/:id/messages', authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = messageSchema.parse(req.body);
    const message = await collabService.postMessage(req.params.id, req.userId!, body.content, body.kind);
    res.status(201).json({ message });
  } catch (e) {
    fail(res, e);
  }
});

export default router;