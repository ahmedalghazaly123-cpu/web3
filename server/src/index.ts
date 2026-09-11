import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import learningRoutes from './routes/learning.js';
import healthRoutes from './routes/health.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const prisma = new PrismaClient();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use('/health', healthRoutes);
app.use('/ready', async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'not-ready', timestamp: new Date().toISOString() });
  }
});
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/learning', learningRoutes);

app.use(errorHandler);

async function start() {
  try {
    await prisma.$connect();
    console.log('PostgreSQL connected');
    const port = process.env.PORT || 4000;
    app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
  } catch (e) {
    console.error('Failed to start server:', e);
    process.exit(1);
  }
}

start();
