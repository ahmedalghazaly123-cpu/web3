import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient, LearningEventKind, LearningEventSource, GraphNodeType, Trend } from '@prisma/client';
import { learningEventService, masteryService, userService } from '../services/index.js';
import { authMiddleware } from '../middleware/auth.js';

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
    const [mastery, events] = await Promise.all([
      masteryService.getMasteryForStudent(userId),
      learningEventService.getEventsForStudent(userId, 500),
    ]);
    const masteryPercent = mastery.length
      ? Math.round(mastery.reduce((sum, m) => sum + m.mastery, 0) / mastery.length)
      : 0;
    res.json({
      masteryPercent,
      masteryCount: mastery.length,
      eventCount: events.length,
      recentEvents: events.slice(0, 20),
    });
  } catch (e) {
    console.error('Progress error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

export default router;
