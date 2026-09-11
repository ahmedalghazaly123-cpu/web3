import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, locale: true, timezone: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: 'not-found' });
  res.json({ user });
});

router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  const requesterId = req.userId;
  const targetId = req.params.id;
  if (!requesterId) return res.status(401).json({ error: 'unauthorized' });
  if (requesterId !== targetId) {
    const requester = await prisma.user.findUnique({ where: { id: requesterId } });
    if (!['ADMIN', 'OWNER'].includes(requester?.role || '')) {
      return res.status(403).json({ error: 'forbidden' });
    }
  }
  const user = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, email: true, name: true, role: true, locale: true, timezone: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: 'not-found' });
  res.json({ user });
});

export default router;
