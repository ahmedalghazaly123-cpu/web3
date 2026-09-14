import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export function requireRole(allowed: Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ error: 'unauthorized' });
    if (user.role === Role.OWNER || allowed.includes(user.role)) {
      return next();
    }
    return res.status(403).json({ error: 'forbidden' });
  };
}