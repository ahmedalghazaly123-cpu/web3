import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function signToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, iat: Date.now() })).toString('base64');
  const signature = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'dev-secret').update(payload).digest('base64');
  return `${payload}.${signature}`;
}

function verifyToken(token: string): { userId: string } | null {
  try {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;
    const expected = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'dev-secret').update(payload).digest('base64');
    if (signature !== expected) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    if (decoded.userId && typeof decoded.userId === 'string') {
      return { userId: decoded.userId };
    }
    return null;
  } catch {
    return null;
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'unauthorized' });
  try {
    const session = await prisma.session.findFirst({
      where: { userId: payload.userId, expiresAt: { gt: new Date() } },
    });
    if (!session) return res.status(401).json({ error: 'unauthorized' });
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

export { signToken, verifyToken };
