import { config as dotenvConfig } from 'dotenv';
dotenvConfig();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import learningRoutes from './routes/learning.js';
import aiRoutes from './routes/ai.js';
import healthRoutes from './routes/health.js';
import classroomsRoutes from './routes/classrooms.js';
import assignmentsRoutes from './routes/assignments.js';
import notificationsRoutes from './routes/notifications.js';
import filesRoutes from './routes/files.js';
import coursesRoutes from './routes/courses.js';
import assessmentsRoutes from './routes/assessments.js';
import adminRoutes from './routes/admin.js';
import ownerRoutes from './routes/owner.js';
import privacyRoutes from './routes/privacy.js';
import ragRoutes from './routes/rag.js';
import { errorHandler } from './middleware/errorHandler.js';
import { prisma } from './lib/prisma.js';
import { startRetentionScheduler } from './services/retentionScheduler.js';

const app = express();
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too-many-requests' },
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '20', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too-many-requests' },
});
app.use('/api/v1/auth', authLimiter);

app.use('/health', healthRoutes);
app.use('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'not-ready', timestamp: new Date().toISOString() });
  }
});
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/learning', learningRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/classrooms', classroomsRoutes);
app.use('/api/v1/assignments', assignmentsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/files', filesRoutes);
app.use('/api/v1/courses', coursesRoutes);
app.use('/api/v1/assessments', assessmentsRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/owner', ownerRoutes);
app.use('/api/v1/privacy', privacyRoutes);
app.use('/api/v1/rag', ragRoutes);

app.use(errorHandler);

async function start() {
  try {
    await prisma.$connect();
    console.log('PostgreSQL connected');
    const port = process.env.PORT || 4000;
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      startRetentionScheduler();
    });
  } catch (e) {
    console.error('Failed to start server:', e);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

start();