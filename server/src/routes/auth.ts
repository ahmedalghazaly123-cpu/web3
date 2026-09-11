import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import { authMiddleware, signToken, verifyToken } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'validation' });
    }
    const allowedRoles = ['student', 'teacher', 'admin', 'owner', 'parent'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'validation' });
    }
    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'email-taken' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name, role: role.toUpperCase() as Role },
    });
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    const token = signToken(user.id);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, locale: user.locale },
    });
  } catch (e) {
    console.error('Signup error:', e);
    res.status(400).json({ error: 'validation' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'validation' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'validation' });
    }
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'invalid-credentials' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'invalid-credentials' });
    }
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    const token = signToken(user.id);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, locale: user.locale },
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(400).json({ error: 'validation' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const payload = verifyToken(token);
      if (payload) {
        await prisma.session.deleteMany({ where: { userId: payload.userId } });
      }
    } catch { /* ignore */ }
  }
  res.json({ ok: true });
});

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

export default router;
