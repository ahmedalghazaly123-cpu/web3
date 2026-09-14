import express, { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { notificationService } from '../services/index.js';

const router = express.Router();

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const [notifications, unreadCount] = await Promise.all([
      notificationService.list(userId, limit),
      notificationService.unreadCount(userId),
    ]);
    res.json({ notifications, unreadCount });
  } catch (e) {
    console.error('List notifications error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = z.object({
      userId: z.string(),
      title: z.string(),
      message: z.string(),
      category: z.string(),
      data: z.any().optional(),
    }).parse(req.body);
    const notification = await notificationService.create(body);
    res.status(201).json({ notification });
  } catch (e: any) {
    console.error('Create notification error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.post('/:id/read', authMiddleware, async (req: Request, res: Response) => {
  try {
    const notification = await notificationService.markRead(req.params.id, req.userId!);
    res.json({ notification });
  } catch (e: any) {
    console.error('Mark read error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

router.post('/read-all', authMiddleware, async (req: Request, res: Response) => {
  try {
    const count = await notificationService.markAllRead(req.userId!);
    res.json({ ok: true, count });
  } catch (e) {
    console.error('Mark all read error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

export default router;
