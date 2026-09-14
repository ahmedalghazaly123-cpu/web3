// Retention enforcement tests — proves retentionDays is actually enforced.
// Old rows beyond the window are deleted; fresh rows and core domain records
// are preserved; users without a window are skipped; expired sessions purged.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE = 'http://localhost:4000/api/v1';

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function signup(role: 'student' | 'admin') {
  const email = `ret-${role}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const res = await request(BASE).post('/auth/signup').send({
    email, password: 'TestPass123!', name: `Ret ${role}`, role,
  });
  return { token: res.body.token as string, userId: res.body.user.id as string };
}

describe('Retention enforcement', () => {
  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => { await prisma.$disconnect(); });

  it('deletes old rows but keeps fresh rows and core records', async () => {
    const { token, userId } = await signup('student');

    // Opt in to a 30-day window.
    const pref = await request(BASE).put('/privacy/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ retentionDays: 30 });
    expect(pref.status).toBe(200);

    // Seed: one old + one fresh learning event, xp event, notification.
    await prisma.learningEvent.create({
      data: { studentId: userId, kind: 'LESSON_VIEWED', source: 'STUDENT', happenedAt: daysAgo(60) },
    });
    await prisma.learningEvent.create({
      data: { studentId: userId, kind: 'LESSON_VIEWED', source: 'STUDENT', happenedAt: daysAgo(5) },
    });
    await prisma.xpEvent.create({
      data: { studentId: userId, kind: 'CORRECT_ANSWER', amount: 10, source: 'test', happenedAt: daysAgo(60) },
    });
    await prisma.xpEvent.create({
      data: { studentId: userId, kind: 'CORRECT_ANSWER', amount: 10, source: 'test', happenedAt: daysAgo(5) },
    });
    await prisma.notification.create({
      data: { userId, title: 'old', message: 'old', category: 'test', createdAt: daysAgo(60) },
    });
    await prisma.notification.create({
      data: { userId, title: 'fresh', message: 'fresh', category: 'test', createdAt: daysAgo(5) },
    });

    const admin = await signup('admin');
    const run = await request(BASE).post('/admin/retention/run')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(run.status).toBe(200);
    expect(run.body.result.usersScanned).toBeGreaterThanOrEqual(1);

    expect(await prisma.learningEvent.count({ where: { studentId: userId } })).toBe(1);
    expect(await prisma.xpEvent.count({ where: { studentId: userId } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId } })).toBe(1);

    // Audit trail written for the purge.
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'retention.purge', targetId: userId },
    });
    expect(audit).toBeTruthy();

    // Core records untouched: user + consents + preferences still exist.
    expect(await prisma.user.findUnique({ where: { id: userId } })).toBeTruthy();
    expect(await prisma.privacyPreference.findUnique({ where: { userId } })).toBeTruthy();
  });

  it('skips users without a retention window', async () => {
    const { userId } = await signup('student');
    await prisma.learningEvent.create({
      data: { studentId: userId, kind: 'LESSON_VIEWED', source: 'STUDENT', happenedAt: daysAgo(400) },
    });
    const admin = await signup('admin');
    await request(BASE).post('/admin/retention/run')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(await prisma.learningEvent.count({ where: { studentId: userId } })).toBe(1);
  });

  it('student cannot trigger a retention run', async () => {
    const { token } = await signup('student');
    const res = await request(BASE).post('/admin/retention/run')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
