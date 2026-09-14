import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ragService } from '../services/ragService.js';

const router = Router();

const askSchema = z.object({
  question: z.string().min(3).max(2000),
  courseId: z.string().min(1),
});

/**
 * POST /api/v1/rag/index
 * Re-index a course's lesson content into rag_chunks with embeddings.
 * Teachers (own courses) and admins only.
 */
router.post('/index', authMiddleware, requireRole([Role.TEACHER, Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const { courseId } = z.object({ courseId: z.string().min(1) }).parse(req.body);
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ error: 'course_not_found' });
    const actor = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!actor) return res.status(401).json({ error: 'unauthorized' });
    if (actor.role === Role.TEACHER && course.instructorId !== req.userId) {
      return res.status(403).json({ error: 'not_your_course' });
    }

    const result = await ragService.indexCourse(courseId);
    return res.json({ ok: true, courseId, ...result });
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : 'bad_request' });
  }
});

/**
 * POST /api/v1/rag/ask
 * Grounded Q&A over indexed course content. Any authenticated user enrolled
 * (or anyone, since courses are browsable) — kept open to authenticated users.
 */
router.post('/ask', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { question, courseId } = askSchema.parse(req.body);
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ error: 'course_not_found' });

    const result = await ragService.askGrounded(question, courseId);
    if ('error' in result) {
      return res.status(422).json({ error: 'no_evidence', message: 'لا يوجد محتوى مفهرس لهذا الكورس أو لا يوجد ما يطابق السؤال.' });
    }
    return res.json(result);
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : 'bad_request' });
  }
});

/**
 * GET /api/v1/rag/status/:courseId
 */
router.get('/status/:courseId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const courseId = req.params.courseId;
    const chunks = await prisma.ragChunk.count({ where: { courseId } });
    const withEmbedding = await prisma.ragChunk.count({ where: { courseId, NOT: { embedding: { equals: null } } } });
    return res.json({ courseId, chunks, embedded: chunks > 0 && withEmbedding > 0 });
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'internal_error' });
  }
});

export default router;
