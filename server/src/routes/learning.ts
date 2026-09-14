import { prisma } from '../lib/prisma.js';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { learningEventService, masteryService, userService, planService, examResultService, auditLogService, xpService } from '../services/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { Trend, XpEventKind } from '@prisma/client';

const router = Router();

const eventSchema = z.object({
  kind: z.enum(['LESSON_VIEWED', 'LESSON_COMPLETED', 'QUESTION_ANSWERED', 'QUIZ_SUBMITTED', 'EXAM_SUBMITTED', 'REVIEW_COMPLETED', 'MISTAKE_RECORDED', 'CONCEPT_LINKED', 'SESSION_STARTED', 'SESSION_ENDED', 'GOAL_UPDATED']),
  source: z.enum(['STUDENT', 'ASSESSMENT', 'AI_TUTOR', 'PLANNER', 'SPACED_REPETITION', 'CLASSROOM', 'SYSTEM']),
  happenedAt: z.string().datetime(),
  nodeId: z.string().optional(),
  nodeType: z.enum(['COURSE', 'MODULE', 'LESSON', 'CONCEPT', 'SKILL', 'TOPIC', 'QUESTION', 'PREREQUISITE']).optional(),
  courseId: z.string().optional(),
  lessonId: z.string().optional(),
  questionId: z.string().optional(),
  sessionId: z.string().optional(),
  assessmentId: z.string().optional(),
  payload: z.any().optional(),
  clientKey: z.string().optional(),
});

router.post('/events', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const data = eventSchema.parse(req.body);
    // Idempotency: a clientKey is stable across retries, so identical
    // (student, kind, clientKey) must never produce a duplicate event.
    if (data.clientKey) {
      const existing = await learningEventService.findEventByClientKey(userId, data.kind, data.clientKey);
      if (existing) return res.status(200).json({ event: existing, duplicate: true });
    }
    const event = await learningEventService.recordEvent({
      studentId: userId,
      ...data,
      happenedAt: new Date(data.happenedAt),
    });
    void auditLogService.log({
      action: `learning.event.${data.kind}`,
      targetType: 'learning_event',
      targetId: event.id,
      actorId: userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
      metadata: { clientKey: data.clientKey, source: data.source },
    });
    res.status(201).json({ event, duplicate: false });
  } catch (e) {
    console.error('Event error:', e);
    res.status(400).json({ error: 'validation' });
  }
});

router.get('/events', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const events = await learningEventService.getEventsForStudent(userId, limit);
    res.json({ events });
  } catch (e) {
    console.error('List events error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

router.get('/mastery', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const records = await masteryService.getMasteryForStudent(userId);
    res.json({ mastery: records });
  } catch (e) {
    console.error('Mastery error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

router.post('/mastery', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const body = req.body;
    const record = await masteryService.upsertMastery({
      ...body,
      studentId: userId,
      lastPracticedAt: new Date(body.lastPracticedAt || Date.now()),
      nextReviewAt: body.nextReviewAt ? new Date(body.nextReviewAt) : undefined,
      trend: body.trend as Trend | undefined,
    } as any);
    res.status(201).json({ mastery: record });
  } catch (e) {
    console.error('Mastery write error:', e);
    res.status(400).json({ error: 'validation' });
  }
});

router.get('/progress', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const [mastery, events, plans, examResults] = await Promise.all([
      masteryService.getMasteryForStudent(userId),
      learningEventService.getEventsForStudent(userId, 500),
      planService.listPlans(userId),
      examResultService.listExamResults(userId),
    ]);
    const masteryPercent = mastery.length
      ? Math.round(mastery.reduce((sum, m) => sum + m.mastery, 0) / mastery.length)
      : 0;
    res.json({
      masteryPercent,
      masteryCount: mastery.length,
      eventCount: events.length,
      recentEvents: events.slice(0, 20),
      planCount: plans.length,
      examResultCount: examResults.length,
    });
  } catch (e) {
    console.error('Progress error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

const planSchema = z.object({
  id: z.string().optional(),
  kind: z.string(),
  title: z.string(),
  titleAr: z.string().optional(),
  courseId: z.string().optional(),
  lessonId: z.string().optional(),
  topic: z.string().optional(),
  estimatedMinutes: z.number().int(),
  scheduledFor: z.string().datetime(),
  priority: z.string(),
  status: z.string(),
  reason: z.string().optional(),
});

router.get('/plans', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const plans = await planService.listPlans(userId);
    res.json({ plans });
  } catch (e) {
    console.error('Plans error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

router.post('/plans', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const data = planSchema.parse(req.body);
    const plan = await planService.upsertPlan({ ...data, studentId: userId, scheduledFor: new Date(data.scheduledFor) });
    res.status(201).json({ plan });
  } catch (e) {
    console.error('Plan write error:', e);
    res.status(400).json({ error: 'validation' });
  }
});

router.put('/plans/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const planId = req.params.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const body = req.body;
    if (body.status) {
      await planService.updatePlanStatus(planId, body.status);
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('Plan update error:', e);
    res.status(400).json({ error: 'validation' });
  }
});

const examResultSchema = z.object({
  assessmentId: z.string(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().optional(),
  submitted: z.boolean().default(false),
  totalQuestions: z.number().int(),
  correct: z.number().int(),
  score: z.number().int(),
  timeUsedSeconds: z.number().optional(),
  questionResults: z.any().optional(),
  analysis: z.any().optional(),
});

router.post('/exam-results', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const data = examResultSchema.parse(req.body);
    const result = await examResultService.saveExamResult({
      ...data,
      studentId: userId,
      startedAt: new Date(data.startedAt),
      finishedAt: data.finishedAt ? new Date(data.finishedAt) : undefined,
    });
    res.status(201).json({ result });
  } catch (e) {
    console.error('Exam result write error:', e);
    res.status(400).json({ error: 'validation' });
  }
});

router.get('/exam-results', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const results = await examResultService.listExamResults(userId);
    res.json({ results });
  } catch (e) {
    console.error('Exam results error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

const ragSearchSchema = z.object({
  query: z.string().min(1),
  courseId: z.string().optional(),
  limit: z.number().int().min(1).max(20).default(5),
});

router.post('/rag/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const { query, courseId, limit = 5 } = ragSearchSchema.parse(req.body);

    void auditLogService.log({
      action: 'rag.search',
      targetType: 'rag_query',
      actorId: userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
      metadata: { queryLength: query.length, courseId, limit },
    });

    let chunks: any[] = [];
    try {
      const embedding = await generateEmbedding(query);
      if (embedding && process.env.PGVECTOR_ENABLED === 'true') {
        if (courseId) {
          chunks = await prisma.$queryRaw`
            SELECT id, "lessonId", text, chunk_idx as "chunkIdx"
            FROM course_chunks
            WHERE "courseId" = ${courseId} AND embedding IS NOT NULL
            ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
            LIMIT ${limit}
          `;
        } else {
          chunks = await prisma.$queryRaw`
            SELECT id, "lessonId", text, chunk_idx as "chunkIdx"
            FROM course_chunks
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
            LIMIT ${limit}
          `;
        }
      }
    } catch (e) {
      console.warn('Vector search failed, falling back to keyword:', e);
    }

    if (chunks.length === 0) {
      try {
        const chunkModel = (prisma as any).courseChunk;
        if (chunkModel?.findMany) {
          chunks = await chunkModel.findMany({
            where: courseId ? { courseId } : undefined,
            select: { id: true, lessonId: true, text: true, chunkIdx: true },
          });
        }
      } catch {
        /* courseChunk model not yet deployed */
      }
      chunks = keywordFallback(query, chunks).slice(0, limit);
    }

    res.json({
      chunks: chunks.map((c) => ({
        id: c.id,
        lessonId: c.lessonId,
        text: c.text,
        chunkIdx: c.chunkIdx ?? c.chunk_idx ?? c.chunkIdx,
      })),
    });
  } catch (e: any) {
    console.error('RAG search error:', e);
    res.status(400).json({ error: e?.message ?? 'bad-request' });
  }
});

function keywordFallback(query: string, chunks: any[]): any[] {
  const qTokens = new Set(query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w: string) => w.length > 2));
  return chunks
    .map((c) => {
      const tTokens = new Set((c.text ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w: string) => w.length > 2));
      let hit = 0;
      qTokens.forEach((w) => { if (tTokens.has(w)) hit++; });
      return { ...c, score: hit };
    })
    .filter((c) => c.score > 0)
    .sort((a: any, b: any) => b.score - a.score);
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
      });
       if (res.ok) {
        const data: any = await res.json();
        return data.data?.[0]?.embedding ?? null;
      }
    } catch (e) {
      console.warn('Embedding generation failed:', e);
    }
  }
  return null;
}


// ─── Canonical XP / Gamification (Phase 24) ───────────────────────────────────
// Single source of truth for XP awarding. Idempotent via clientKey + unique
// constraint on (studentId, clientKey). Atomic transaction: XP event + level
// update happen together. Server-side authorization only — studentId is always
// derived from authenticated session, never from request body.

const xpSchema = z.object({
  kind: z.enum(['CORRECT_ANSWER', 'REVIEW', 'STREAK', 'MASTERY', 'ACHIEVEMENT', 'DEMO', 'BONUS']),
  amount: z.number().int().min(1),
  source: z.string().min(1),
  clientKey: z.string().optional(),
  metadata: z.any().optional(),
  happenedAt: z.string().datetime(),
});

router.post('/xp', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const data = xpSchema.parse(req.body);

    // Enforce role restrictions: STUDENT cannot award DEMO/BONUS XP.
    const actor = await prisma.user.findUnique({ where: { id: userId } });
    if (!actor) return res.status(401).json({ error: 'unauthorized' });
    if ((data.kind === 'DEMO' || data.kind === 'BONUS') && actor.role !== 'ADMIN' && actor.role !== 'OWNER') {
      return res.status(403).json({ error: 'forbidden' });
    }

    const result = await xpService.award({
      studentId: userId,
      kind: data.kind as XpEventKind,
      amount: data.amount,
      source: data.source,
      clientKey: data.clientKey,
      metadata: data.metadata,
      happenedAt: new Date(data.happenedAt),
    });

    void auditLogService.log({
      action: result.awarded ? 'xp.awarded' : 'xp.duplicate',
      targetType: 'xp_event',
      actorId: userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
      metadata: { kind: data.kind, amount: data.amount, clientKey: data.clientKey, awarded: result.awarded },
    });

    res.json(result);
  } catch (e: any) {
    console.error('XP award error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.get('/xp', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const level = await xpService.getStudentLevel(userId);
    const events = await xpService.listEvents(userId, Math.min(Number(req.query.limit) || 50, 500));
    res.json({ level, events });
  } catch (e: any) {
    console.error('XP list error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});


export default router;
