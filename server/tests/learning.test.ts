import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

describe('Learning API', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('requires authentication', async () => {
    const res = await request('http://localhost:4000').get('/api/v1/learning/events');
    expect(res.status).toBe(401);
  });

  it('records a learning event for authenticated user', async () => {
    const login = await request('http://localhost:4000').post('/api/v1/auth/login').send({
      email: 'student@learnpilot.dev',
      password: 'learnpilot',
    });
    expect(login.status).toBe(200);
    const token = login.body.token;
    const res = await request('http://localhost:4000')
      .post('/api/v1/learning/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        kind: 'LESSON_VIEWED',
        source: 'STUDENT',
        happenedAt: new Date().toISOString(),
        lessonId: 'lesson-1',
        courseId: 'course-1',
      });
    expect(res.status).toBe(201);
    expect(res.body.event.kind).toBe('LESSON_VIEWED');
  });

           it('returns mastery summary', async () => {
    const login = await request('http://localhost:4000').post('/api/v1/auth/login').send({
      email: 'student@learnpilot.dev',
      password: 'learnpilot',
    });
    const res = await request('http://localhost:4000')
      .get('/api/v1/learning/progress')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.masteryPercent).toBeDefined();
  });

  it('deduplicates learning events by clientKey (idempotency)', async () => {
    const login = await request('http://localhost:4000').post('/api/v1/auth/login').send({
      email: 'student@learnpilot.dev',
      password: 'learnpilot',
    });
    const token = login.body.token;
    // Unique clientKey per run so the first POST is always a 201 (no residual row).
    const clientKey = `e2e-idempotency-test-${Date.now()}`;
    const payload = {
      kind: 'QUESTION_ANSWERED',
      source: 'ASSESSMENT',
      happenedAt: new Date().toISOString(),
      nodeId: 'concept-limits',
      nodeType: 'CONCEPT',
      questionId: 'q-idempotency',
      clientKey,
    };
    const r1 = await request('http://localhost:4000')
      .post('/api/v1/learning/events')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(r1.status).toBe(201);
    expect(r1.body.duplicate).toBe(false);

    const r2 = await request('http://localhost:4000')
      .post('/api/v1/learning/events')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(r2.status).toBe(200);
    expect(r2.body.duplicate).toBe(true);
    expect(r2.body.event.id).toBe(r1.body.event.id);
  });

  it('upserts mastery and reflects it in progress', async () => {
    const login = await request('http://localhost:4000').post('/api/v1/auth/login').send({
      email: 'student@learnpilot.dev',
      password: 'learnpilot',
    });
    const token = login.body.token;
    const upsert = await request('http://localhost:4000')
      .post('/api/v1/learning/mastery')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nodeId: 'concept-planner-e2e',
        nodeType: 'CONCEPT',
        mastery: 90,
        attempts: 5,
        lastPracticedAt: new Date().toISOString(),
        confidence: 80,
        trend: 'IMPROVING',
        mastered: true,
      });
    expect(upsert.status).toBe(201);
    expect(upsert.body.mastery.mastery).toBe(90);
    expect(upsert.body.mastery.nodeId).toBe('concept-planner-e2e');

    const prog = await request('http://localhost:4000')
      .get('/api/v1/learning/progress')
      .set('Authorization', `Bearer ${token}`);
    expect(prog.status).toBe(200);
    expect(prog.body.masteryPercent).toBeDefined();
    expect(prog.body.masteryCount).toBeGreaterThanOrEqual(1);
  });
});
