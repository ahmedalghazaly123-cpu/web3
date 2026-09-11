import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

describe('Auth API', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects invalid email', async () => {
    const res = await request('http://localhost:4000').post('/api/v1/auth/login').send({ email: 'bad', password: 'x' });
    expect(res.status).toBe(400);
  });

  it('rejects missing password', async () => {
    const res = await request('http://localhost:4000').post('/api/v1/auth/login').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('rejects wrong credentials', async () => {
    const res = await request('http://localhost:4000').post('/api/v1/auth/login').send({ email: 'student@learnpilot.dev', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('accepts valid credentials and returns token', async () => {
    const res = await request('http://localhost:4000').post('/api/v1/auth/login').send({ email: 'student@learnpilot.dev', password: 'learnpilot' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('STUDENT');
  });

  it('returns current user with token', async () => {
    const login = await request('http://localhost:4000').post('/api/v1/auth/login').send({ email: 'teacher@learnpilot.dev', password: 'learnpilot' });
    expect(login.status).toBe(200);
    const res = await request('http://localhost:4000').get('/api/v1/auth/me').set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('TEACHER');
  });
});
