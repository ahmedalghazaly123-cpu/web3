import express, { Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authMiddleware } from '../middleware/auth.js';
import { fileService } from '../services/index.js';

// ─── Local disk storage ──────────────────────────────────────────────────────
// Real byte storage under server/uploads/<userId>/ managed by multer.
// Served back via GET /api/v1/files/:id/download (auth + visibility checks).
// Uploads dir is gitignored; metadata still lives in PostgreSQL.
const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(UPLOAD_ROOT, String((req as any).userId || 'anon'));
    try {
      ensureDir(dir);
      cb(null, dir);
    } catch (e) {
      cb(e as Error, dir);
    }
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'file';
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
});

const router = express.Router();

const ALLOWED_MIME = new Set([
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  'video/mp4', 'video/webm',
]);

function publicUrl(req: Request, id: string) {
  const base = process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`;
  return `${base}/api/v1/files/${id}/download`;
}

// POST /api/v1/files/upload — multipart/form-data { file, title?, description?, tags?, visibility?, classroomId? }
router.post('/upload', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const f = (req as any).file as Express.Multer.File | undefined;
    if (!f) return res.status(400).json({ error: 'file-required' });
    if (!ALLOWED_MIME.has(f.mimetype)) {
      fs.promises.unlink(f.path).catch(() => {});
      return res.status(400).json({ error: 'unsupported-mime' });
    }
    const meta = z.object({
      title: z.string().max(200).optional(),
      description: z.string().max(2000).optional(),
      tags: z.string().max(500).optional(), // comma-separated or JSON array
      visibility: z.enum(['PRIVATE', 'CLASSROOM', 'PUBLIC']).optional(),
      classroomId: z.string().optional(),
    }).parse(req.body ?? {});
    let tags: string[] | undefined;
    if (meta.tags) {
      try {
        const parsed: unknown = JSON.parse(meta.tags);
        tags = Array.isArray(parsed) ? parsed.map(String) : meta.tags.split(',').map((s) => s.trim()).filter(Boolean);
      } catch {
        tags = meta.tags.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    const { category } = fileService.validate(f.mimetype, f.size);
    const buf = await fs.promises.readFile(f.path);
    const checksum = crypto.createHash('sha256').update(buf).digest('hex');
    const storageKey = path.relative(UPLOAD_ROOT, f.path).replace(/\\/g, '/');
    const file = await fileService.create({
      uploaderId: req.userId!,
      filename: f.filename,
      originalName: f.originalname,
      mimeType: f.mimetype,
      sizeBytes: f.size,
      category: category!,
      url: '', // placeholder, patched below with the real download URL
      storageKey,
      checksum,
      title: meta.title,
      description: meta.description,
      tags,
      visibility: meta.visibility as any,
      classroomId: meta.classroomId,
    });
    const url = publicUrl(req, file.id);
    const updated = await fileService.setUrl(file.id, url);
    res.status(201).json({ file: updated });
  } catch (e: any) {
    console.error('Upload file error:', e);
    // Best effort: remove orphan bytes on metadata failure.
    const f = (req as any).file as Express.Multer.File | undefined;
    if (f) fs.promises.unlink(f.path).catch(() => {});
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.post('/register', authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = z.object({
      filename: z.string().min(1),
      originalName: z.string().min(1),
      mimeType: z.string(),
      sizeBytes: z.number().int().min(0),
      url: z.string().url(),
      storageKey: z.string().min(1),
      title: z.string().optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      visibility: z.enum(['PRIVATE', 'CLASSROOM', 'PUBLIC']).optional(),
      classroomId: z.string().optional(),
    }).parse(req.body);
    if (!ALLOWED_MIME.has(body.mimeType)) {
      return res.status(400).json({ error: 'unsupported-mime' });
    }
    if (body.sizeBytes > 50 * 1024 * 1024) {
      return res.status(400).json({ error: 'file-too-large' });
    }
const { category } = fileService.validate(body.mimeType, body.sizeBytes);
    const file = await fileService.create({
      uploaderId: req.userId!,
      filename: body.filename,
      originalName: body.originalName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      url: body.url,
category: category!,
      storageKey: body.storageKey,
      title: body.title,
      description: body.description,
      tags: body.tags,
      visibility: body.visibility,
      classroomId: body.classroomId,
    });
    res.status(201).json({ file });
  } catch (e: any) {
    console.error('Register file error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const files = await fileService.listForUser(req.userId!, {
      category: req.query.category as any,
      classroomId: req.query.classroomId as string,
      limit: Math.min(Number(req.query.limit) || 50, 200),
    });
    res.json({ files });
  } catch (e: any) {
    console.error('List files error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const file = await fileService.getMetadata(req.params.id, req.userId!);
    res.json({ file });
  } catch (e: any) {
    console.error('Get file error:', e);
    res.status(404).json({ error: e?.message ?? 'not-found' });
  }
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await fileService.delete(req.params.id, req.userId!);
    res.json({ ok: true });
  } catch (e: any) {
    console.error('Delete file error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

// GET /api/v1/files/:id/download — stream stored bytes (auth + visibility checks)
router.get('/:id/download', authMiddleware, async (req: Request, res: Response) => {
  try {
    const file = await fileService.getMetadata(req.params.id, req.userId!);
    const abs = path.resolve(UPLOAD_ROOT, file.storageKey);
    // Prevent path traversal: resolved path must stay under UPLOAD_ROOT.
    if (abs !== path.resolve(abs) || !abs.startsWith(path.resolve(UPLOAD_ROOT))) {
      return res.status(400).json({ error: 'invalid-storage-key' });
    }
    try {
      await fs.promises.access(abs, fs.constants.R_OK);
    } catch {
      // Legacy rows registered via /register have no local bytes.
      return res.status(410).json({ error: 'bytes-not-stored-locally', url: file.url });
    }
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName.replace(/"/g, '')}"`);
    res.setHeader('Content-Length', String(file.sizeBytes));
    fs.createReadStream(abs).pipe(res);
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    if (msg === 'forbidden') return res.status(403).json({ error: 'forbidden' });
    console.error('Download file error:', e);
    res.status(404).json({ error: msg || 'not-found' });
  }
});

export default router;
