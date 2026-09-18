import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Health API', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns health status', async () => {
    const res = await request('http://localhost:4000').get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('RBAC', () => {
  it('student cannot access admin endpoints', async () => {
    const login = await request('http://localhost:4000').post('/api/v1/auth/login').send({
      email: 'student@learnpilot.dev',
      password: 'learnpilot',
    });
    const res = await request('http://localhost:4000').get('/api/v1/users/some-id').set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(403);
  });

  it('admin cannot sign in without the Owner-issued invite code', async () => {
    const res = await request('http://localhost:4000').post('/api/v1/auth/login').send({
      email: 'admin@learnpilot.dev',
      password: 'learnpilot',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invite-code-required');
  });

  it('admin can access other user data after signing in with the invite code', async () => {
    const adminLogin = await request('http://localhost:4000').post('/api/v1/auth/login').send({
      email: 'admin@learnpilot.dev',
      password: 'learnpilot',
      // The fixed code the Owner "created" (env override: ADMIN_INVITE_CODE).
      inviteCode: process.env.ADMIN_INVITE_CODE || 'Ahmed',
    });
    expect(adminLogin.body.token).toBeTruthy();
    const student = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
    if (!student) return;
    const res = await request('http://localhost:4000').get(`/api/v1/users/${student.id}`).set('Authorization', `Bearer ${adminLogin.body.token}`);
    expect(res.status).toBe(200);
  });
});
