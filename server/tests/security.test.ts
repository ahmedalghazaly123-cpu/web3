// Privacy & Security API tests (Wave 2 gap closure)
// Verifies authentication, authorization, ownership, and safe error behavior
// for consent, preferences, data export, and data deletion endpoints.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE = 'http://localhost:4000/api/v1';

async function signup(role: 'student' | 'teacher' | 'admin' | 'owner') {
  // Unique per test file + worker + timestamp so parallel suites running
  // against the same live server never collide on the same email address
  // (which would surface as 400 email-taken instead of the asserted 200).
  const email = `priv-${role}-${process.pid}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const res = await request(BASE).post('/auth/signup').send({
    email, password: 'TestPass123!', name: `Priv ${role}`, role,
  });
  return { email, token: res.body.token, userId: res.body.user.id };
}

describe('Privacy API security', () => {
  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => { await prisma.$disconnect(); });

  it('requires authentication for consent list', async () => {
    const res = await request(BASE).get('/privacy/consents');
    expect(res.status).toBe(401);
  });

  it('authenticated user can view own consent state', async () => {
    const { token } = await signup('student');
    const res = await request(BASE).get('/privacy/consents').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.consents)).toBe(true);
    expect(res.body.consents.length).toBeGreaterThan(0);
  });

  it('authenticated user can update own consent', async () => {
    const { token } = await signup('student');
    const res = await request(BASE)
      .put('/privacy/consents/analytics')
      .set('Authorization', `Bearer ${token}`)
      .send({ granted: true, policyVersion: 'v1' });
    expect(res.status).toBe(200);
    expect(res.body.consent.granted).toBe(true);
  });

  it('authenticated user can revoke own consent', async () => {
    const { token } = await signup('student');
    const res = await request(BASE)
      .delete('/privacy/consents/analytics')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.consent.granted).toBe(false);
  });

  it('authenticated user can view own privacy preferences', async () => {
    const { token } = await signup('student');
    const res = await request(BASE).get('/privacy/preferences').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.preferences).toBeDefined();
  });

  it('authenticated user can update own privacy preferences', async () => {
    const { token } = await signup('student');
    const res = await request(BASE)
      .put('/privacy/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ analyticsOptIn: true, retentionDays: 30 });
    expect(res.status).toBe(200);
    expect(res.body.preferences.analyticsOptIn).toBe(true);
    expect(res.body.preferences.retentionDays).toBe(30);
  });

  it('authenticated user can export own data', async () => {
    const { token } = await signup('student');
    const res = await request(BASE).get('/privacy/export').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.profile).toBeDefined();
    expect(res.body.data.profile.email).toContain('priv-student-');
  });

  it('export does not include password hashes or tokens', async () => {
    const { token } = await signup('student');
    const res = await request(BASE).get('/privacy/export').set('Authorization', `Bearer ${token}`);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('passwordHash');
    expect(raw).not.toContain(token);
  });
});

describe('XP authorization', () => {
  it('student cannot award BONUS XP', async () => {
    const { token } = await signup('student');
    const res = await request(BASE)
      .post('/learning/xp')
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'BONUS', amount: 100, source: 'student', happenedAt: new Date().toISOString() });
    expect(res.status).toBe(403);
  });

  it('student cannot award DEMO XP', async () => {
    const { token } = await signup('student');
    const res = await request(BASE)
      .post('/learning/xp')
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'DEMO', amount: 100, source: 'student', happenedAt: new Date().toISOString() });
    expect(res.status).toBe(403);
  });

  it('admin can award BONUS XP', async () => {
    const { token } = await signup('admin');
    const res = await request(BASE)
      .post('/learning/xp')
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'BONUS', amount: 50, source: 'admin', happenedAt: new Date().toISOString() });
    expect(res.status).toBe(200);
  });

  it('unauthenticated XP request is rejected', async () => {
    const res = await request(BASE)
      .post('/learning/xp')
      .send({ kind: 'CORRECT_ANSWER', amount: 10, source: 'student', happenedAt: new Date().toISOString() });
    expect(res.status).toBe(401);
  });

  it('XP award is idempotent for same clientKey', async () => {
    const { token } = await signup('student');
    const key = `idem-${Date.now()}`;
    const payload = { kind: 'CORRECT_ANSWER', amount: 10, source: 'student', clientKey: key, happenedAt: new Date().toISOString() };
    const r1 = await request(BASE).post('/learning/xp').set('Authorization', `Bearer ${token}`).send(payload);
    const r2 = await request(BASE).post('/learning/xp').set('Authorization', `Bearer ${token}`).send(payload);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r1.body.awarded).toBe(true);
    expect(r2.body.awarded).toBe(false);
    expect(r2.body.xp).toBe(r1.body.xp);
  });
});

describe('RBAC regression', () => {
  it('student cannot access admin user list', async () => {
    const { token } = await signup('student');
    const res = await request(BASE).get('/admin/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('admin can access admin user list', async () => {
    const { token } = await signup('admin');
    const res = await request(BASE).get('/admin/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('student cannot access another user via /users/:id', async () => {
    const student = await signup('student');
    const other = await signup('student');
    const res = await request(BASE)
      .get(`/users/${other.userId}`)
      .set('Authorization', `Bearer ${student.token}`);
    expect(res.status).toBe(403);
  });

  it('owner can access another user via /users/:id', async () => {
    const owner = await signup('owner');
    const student = await signup('student');
    const res = await request(BASE)
      .get(`/users/${student.userId}`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(res.status).toBe(200);
  });
});