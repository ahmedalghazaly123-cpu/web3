import express, { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { Role } from '@prisma/client';
import { assessmentService } from '../services/index.js';

const router = express.Router();

const questionSchema = z.object({
  courseId: z.string().optional(),
  lessonId: z.string().optional(),
  topic: z.string().min(1),
  topicAr: z.string().optional(),
  skillId: z.string().optional(),
  conceptId: z.string().optional(),
  type: z.enum(['MULTIPLE_CHOICE', 'MULTIPLE_SELECT', 'SHORT_ANSWER', 'CODE', 'MATH']),
  difficulty: z.number().int().min(1).max(5),
  body: z.string().min(1),
  bodyAr: z.string().optional(),
  options: z.array(z.string()).optional(),
  correctOptionIndex: z.number().int().optional(),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(1),
  explanationAr: z.string().optional(),
  sourceLessonId: z.string().optional(),
  sourceMaterial: z.string().optional(),
  tags: z.array(z.string()).optional(),
  cognitiveLevel: z.enum(['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE']).optional(),
});

const assessmentSchema = z.object({
  title: z.string().min(1),
  titleAr: z.string().optional(),
  type: z.enum(['QUIZ', 'EXAM']),
  courseId: z.string().optional(),
  lessonId: z.string().optional(),
  questionIds: z.array(z.string()).min(1),
  timeLimitSeconds: z.number().int().optional(),
  passingScore: z.number().int().min(0).default(60),
  randomized: z.boolean().default(false),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  adaptive: z.boolean().default(false),
  topicCoverage: z.any().optional(),
  difficultyDistribution: z.any().optional(),
});

router.get('/questions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const questions = await assessmentService.listQuestions({
      courseId: req.query.courseId as string | undefined,
      type: req.query.type as any,
      difficulty: req.query.difficulty ? Number(req.query.difficulty) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : 100,
    });
    res.json({ questions });
  } catch (e) {
    console.error('List questions error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

router.get('/questions/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const question = await assessmentService.getQuestion(req.params.id);
    if (!question) return res.status(404).json({ error: 'not-found' });
    res.json({ question });
  } catch (e) {
    console.error('Get question error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

router.post('/questions', authMiddleware, requireRole([Role.TEACHER, Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const data = questionSchema.parse(req.body);
    const question = await assessmentService.createQuestion(data);
    res.status(201).json({ question });
  } catch (e: any) {
    console.error('Create question error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const assessments = await assessmentService.listAssessments({
      courseId: req.query.courseId as string | undefined,
      type: req.query.type as any,
    });
    res.json({ assessments });
  } catch (e) {
    console.error('List assessments error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const assessment = await assessmentService.getAssessment(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'not-found' });
    res.json({ assessment });
  } catch (e) {
    console.error('Get assessment error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

router.post('/', authMiddleware, requireRole([Role.TEACHER, Role.ADMIN, Role.OWNER]), async (req: Request, res: Response) => {
  try {
    const data = assessmentSchema.parse(req.body);
    const assessment = await assessmentService.createAssessment(data);
    res.status(201).json({ assessment });
  } catch (e: any) {
    console.error('Create assessment error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.post('/attempts', authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = z.object({
      studentId: z.string(),
      questionId: z.string(),
      selectedAnswer: z.string(),
      correct: z.boolean(),
      timeSpentSeconds: z.number().int().min(0),
      sessionId: z.string().optional(),
      mode: z.enum(['QUIZ', 'EXAM', 'PRACTICE', 'ADAPTIVE', 'AI_TUTOR']).optional(),
      mistakeId: z.string().optional(),
    }).parse(req.body);
    if (body.studentId !== req.userId) return res.status(403).json({ error: 'forbidden' });
    const attempt = await assessmentService.recordAttempt(body);
    res.status(201).json({ attempt });
  } catch (e: any) {
    console.error('Record attempt error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.get('/attempts/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const attempts = await assessmentService.listAttempts(req.userId!);
    res.json({ attempts });
  } catch (e) {
    console.error('List attempts error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

export default router;
