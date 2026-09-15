import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { voiceService, auditLogService } from '../services/index.js';

const router = Router();

// Audio is held in memory (max 25 MB) and forwarded to the STT provider — no
// audio is written to disk, so a failed transcription leaves no residue.
const ALLOWED_AUDIO = new Set([
  'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
  'audio/mp4', 'audio/m4a', 'audio/flac', 'video/webm',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_AUDIO.has(file.mimetype)) return cb(null, true);
    cb(new Error('unsupported-audio-mime'));
  },
});

const languageSchema = z.enum(['en', 'ar']).default('en');

const createSessionSchema = z.object({
  language: languageSchema,
});

const transcriptSchema = z.object({
  text: z.string().min(1).max(4000),
  lang: languageSchema,
});

/** Map service errors to HTTP codes (same vocabulary as the other routes). */
function fail(res: Response, e: unknown) {
  const msg = String((e as Error)?.message ?? 'validation');
  if (msg === 'forbidden') return res.status(403).json({ error: 'forbidden' });
  if (msg === 'not-found') return res.status(404).json({ error: 'not-found' });
  return res.status(400).json({ error: msg });
}

/** POST /api/v1/voice/sessions — open a tutor session (client keeps the id). */
router.post('/sessions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { language } = createSessionSchema.parse(req.body ?? {});
    const session = await voiceService.createSession(req.userId!, language);
    res.status(201).json({ session });
  } catch (e) {
    fail(res, e);
  }
});

/** GET /api/v1/voice/sessions — the caller's session history. */
router.get('/sessions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const sessions = await voiceService.listSessions(req.userId!, limit);
    res.json({ sessions });
  } catch (e) {
    fail(res, e);
  }
});

/** GET /api/v1/voice/sessions/:id — session with its transcript messages. */
router.get('/sessions/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const session = await voiceService.getSession(req.params.id, req.userId!);
    res.json({ session });
  } catch (e) {
    fail(res, e);
  }
});

/** POST /api/v1/voice/sessions/:id/transcript — append learner speech text. */
router.post('/sessions/:id/transcript', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { text } = transcriptSchema.parse(req.body);
    const transcript = await voiceService.appendTranscript(req.params.id, req.userId!, text);
    res.json({ transcript });
  } catch (e) {
    fail(res, e);
  }
});

/** POST /api/v1/voice/sessions/:id/answer — persist the AI answer + latency. */
router.post('/sessions/:id/answer', authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = z
      .object({ content: z.string().min(1).max(4000), latencyMs: z.number().int().nonnegative().optional() })
      .parse(req.body);
    await voiceService.appendAnswer(req.params.id, req.userId!, body.content, body.latencyMs);
    res.json({ ok: true });
  } catch (e) {
    fail(res, e);
  }
});

/** POST /api/v1/voice/sessions/:id/close — close with an optional summary. */
router.post('/sessions/:id/close', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { summary } = z.object({ summary: z.string().max(1000).optional() }).parse(req.body ?? {});
    const session = await voiceService.closeSession(req.params.id, req.userId!, summary);
    res.json({ session });
  } catch (e) {
    fail(res, e);
  }
});

/**
 * POST /api/v1/voice/synthesize — text -> speech (server-side TTS).
 * Returns 503 with `voice-provider-unavailable` when no TTS key is configured,
 * so the client can fall back to the browser voice instead of silently failing.
 */
router.post('/synthesize', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { text, lang } = z
      .object({ text: z.string().min(1).max(2000), lang: languageSchema })
      .parse(req.body);
    const result = await voiceService.synthesizeSpeech(text, lang);
    if (!result) return res.status(503).json({ error: 'voice-provider-unavailable' });
    void auditLogService.log({
      action: 'voice.synthesize',
      targetType: 'voice_session',
      actorId: req.userId,
      ipAddress: req.ip,
      metadata: { lang, chars: text.length, provider: result.provider },
    });
    res.setHeader('Content-Type', result.mime);
    res.setHeader('Content-Disposition', `attachment; filename="voice-${Date.now()}.wav"`);
    res.send(result.audio);
  } catch (e) {
    fail(res, e);
  }
});

/**
 * POST /api/v1/voice/transcribe — audio file -> text (server-side STT).
 * multipart/form-data with `audio` (or `file`) + optional `lang`.
 */
router.post('/transcribe', authMiddleware, upload.single('audio'), async (req: Request & { file?: Express.Multer.File }, res: Response) => {
  try {
    const file = req.file ?? (req as any).file;
    if (!file) return res.status(400).json({ error: 'no-audio-file' });
    const { lang } = z.object({ lang: languageSchema }).parse(req.body ?? {});
    const result = await voiceService.transcribeAudio(file.buffer, file.originalname, file.mimetype, lang);
    if (!result) return res.status(503).json({ error: 'voice-provider-unavailable' });
    res.json({ text: result.text, provider: result.provider });
  } catch (e) {
    fail(res, e);
  }
});

/** GET /api/v1/voice/summary/:id — deterministic summary of a session transcript. */
router.get('/summary/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const session = await voiceService.getSession(req.params.id, req.userId!);
    if (!session) return res.status(404).json({ error: 'not-found' });
    if (!session.transcript) return res.status(400).json({ error: 'empty-transcript' });
    const summary = voiceService.summarizeTranscript(session.transcript, session.language === 'AR' ? 'ar' : 'en');
    res.json({ summary });
  } catch (e) {
    fail(res, e);
  }
});

export default router;