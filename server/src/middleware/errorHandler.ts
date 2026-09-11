import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'internal-server-error' });
}
