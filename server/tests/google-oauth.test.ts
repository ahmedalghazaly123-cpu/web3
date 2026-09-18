import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { prisma } from '../src/lib/prisma.js';
import authRoutes from '../src/routes/auth.js';
import { verifyToken } from '../src/middleware/auth.js';

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    session: { create: vi.fn() },
  },
}));
vi.mock('../src/services/index.js', () => ({
  auditLogService: { log: vi.fn() }, userService: {},
  inviteCodeService: { findUsable: vi.fn().mockResolvedValue(null), matchesStoredSecurityCode: vi.fn().mockResolvedValue(false) },
}));

const app = express();
app.use(cookieParser());
// The real server mounts express.json(); without it POST bodies are undefined.
app.use(express.json());
app.use('/api/v1/auth', authRoutes);
const base = '/api/v1/auth/google';

beforeEach(() => {
  vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client');
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret');
  vi.stubEnv('FRONTEND_URL', 'http://localhost:3000');
  // The real server/.env now carries GitHub (and may carry LinkedIn) keys —
  // keep these suites deterministic by stubbing them off unless a test opts in.
  vi.stubEnv('GITHUB_CLIENT_ID', '');
  vi.stubEnv('GITHUB_CLIENT_SECRET', '');
  vi.stubEnv('LINKEDIN_CLIENT_ID', '');
  vi.stubEnv('LINKEDIN_CLIENT_SECRET', '');
  vi.stubGlobal('fetch', vi.fn());
  vi.mocked(prisma.session.create).mockResolvedValue({ id: 'test-session' } as never);
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function start(role = '') {
  const query = role ? `?role=${role}` : '';
  const response = await request(app).get(base + query);
  const state = new URL(response.headers.location).searchParams.get('state')!;
  const cookie = (response.headers['set-cookie'] as unknown as string[])[0];
  return { response, state, cookie };
}

function mockGoogleAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: 'google-account',
    email: 'teacher@example.com',
    name: 'Teacher',
    role: 'TEACHER',
    locale: 'en',
    passwordHash: 'existing-hash',
    passwordSetAt: new Date('2026-01-01T00:00:00Z'),
    googleId: 'google-sub',
    githubId: null,
    appleId: null,
    ...overrides,
  } as never;
}

function mockGoogle(email = 'teacher@example.com') {
  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'google-test-token' })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ sub: 'google-sub', email, email_verified: true, name: 'Teacher' })));
}

function redirectOf(res: { headers: { location: string } }) {
  return new URL(res.headers.location);
}

describe('Google OAuth regression', () => {
  it('keeps the HttpOnly state cookie for ten minutes, not 600 milliseconds', async () => {
    const { response, cookie } = await start();
    expect(response.status).toBe(302);
    expect(new URL(response.headers.location).hostname).toBe('accounts.google.com');
    expect(cookie).toContain('Max-Age=600;');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('binds the requested role into the signed state (?role=teacher)', async () => {
    const { response, state } = await start('teacher');
    expect(new URL(response.headers.location).searchParams.get('state')).toBe(state);
    expect(state.endsWith(':teacher')).toBe(true);
  });

  it('creates a NEW Google account as TEACHER without a password and sends it to set-password once', async () => {
    const { state, cookie } = await start('teacher');
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(
      mockGoogleAccount({ id: 'new-teacher', passwordHash: null, passwordSetAt: null }),
    );
    mockGoogle();
    const response = await request(app).get(`${base}/callback`)
      .set('Cookie', cookie.split(';')[0]).query({ code: 'test-code', state });
    const target = redirectOf(response);
    expect(target.pathname).toBe('/auth/set-password');
    expect(target.searchParams.get('provider')).toBe('google');
    // No dashboard session before the site password exists.
    expect(prisma.session.create).not.toHaveBeenCalled();
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ role: 'TEACHER', passwordHash: null, googleId: 'google-sub' }),
    }));
  });

  it('signs an EXISTING teacher in with the teacher option and keeps their role', async () => {
    const { state, cookie } = await start('teacher');
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockGoogleAccount({ id: 'teacher-id' }));
    mockGoogle();
    const response = await request(app).get(`${base}/callback`)
      .set('Cookie', cookie.split(';')[0]).query({ code: 'test-code', state });
    expect(redirectOf(response).searchParams.has('token')).toBe(true);
    expect(redirectOf(response).searchParams.has('google_error')).toBe(false);
    expect(verifyToken(redirectOf(response).searchParams.get('token')!)).toEqual({ userId: 'teacher-id' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('keeps an EXISTING account role even when another role was chosen (no role switching)', async () => {
    const { state, cookie } = await start('teacher');
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockGoogleAccount({ id: 'student-id', role: 'STUDENT' }));
    mockGoogle();
    const response = await request(app).get(`${base}/callback`)
      .set('Cookie', cookie.split(';')[0]).query({ code: 'test-code', state });
    expect(redirectOf(response).searchParams.has('token')).toBe(true);
    expect(redirectOf(response).searchParams.has('google_error')).toBe(false);
    expect(verifyToken(redirectOf(response).searchParams.get('token')!)).toEqual({ userId: 'student-id' });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.session.create).toHaveBeenCalledOnce();
  });

  it('refuses to mint ADMIN or OWNER through Google — those roles are invite-only', async () => {
    for (const role of ['admin', 'owner'] as const) {
      vi.clearAllMocks();
      vi.mocked(prisma.session.create).mockResolvedValue({ id: 's' } as never);
      const { state, cookie } = await start(role);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      mockGoogle();
      const response = await request(app).get(`${base}/callback`)
        .set('Cookie', cookie.split(';')[0]).query({ code: 'test-code', state });
      expect(redirectOf(response).searchParams.has('token')).toBe(false);
      expect(redirectOf(response).searchParams.get('google_error')).toBe('role_requires_invite');
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.session.create).not.toHaveBeenCalled();
    }
  });

  it('lets an EXISTING owner sign in with Google and keeps their role', async () => {
    const { state, cookie } = await start('owner');
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockGoogleAccount({ id: 'owner-id', role: 'OWNER' }));
    mockGoogle('owner@example.com');
    const response = await request(app).get(`${base}/callback`)
      .set('Cookie', cookie.split(';')[0]).query({ code: 'test-code', state });
    expect(redirectOf(response).searchParams.has('google_error')).toBe(false);
    expect(verifyToken(redirectOf(response).searchParams.get('token')!)).toEqual({ userId: 'owner-id' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('ignores a forged ?role= in the callback URL — role comes from the signed state only', async () => {
    const { state, cookie } = await start('student');
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(mockGoogleAccount({ id: 'new-id', role: 'STUDENT', passwordHash: null }));
    mockGoogle();
    const response = await request(app).get(`${base}/callback`)
      .set('Cookie', cookie.split(';')[0]).query({ code: 'test-code', state, role: 'owner' });
    expect(redirectOf(response).searchParams.get('google_error')).toBe(null);
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ role: 'STUDENT' }),
    }));
  });

  it('links an existing password account by verified e-mail and logs in without touching the password', async () => {
    const { state, cookie } = await start('student');
    // Found by e-mail (no googleId yet) — the address is verified, so it links.
    vi.mocked(prisma.user.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mockGoogleAccount({ id: 'manual-id', googleId: null, role: 'STUDENT' }));
    vi.mocked(prisma.user.update).mockResolvedValue(
      mockGoogleAccount({ id: 'manual-id', role: 'STUDENT' }),
    );
    mockGoogle();
    const response = await request(app).get(`${base}/callback`)
      .set('Cookie', cookie.split(';')[0]).query({ code: 'test-code', state });
    expect(verifyToken(redirectOf(response).searchParams.get('token')!)).toEqual({ userId: 'manual-id' });
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'manual-id' },
      data: { googleId: 'google-sub' },
    }));
    // The existing site password is never re-written by a social sign-in.
    const updateData = vi.mocked(prisma.user.update).mock.calls[0][0] as { data: Record<string, unknown> };
    expect(updateData.data).not.toHaveProperty('passwordHash');
  });

  it('refuses to link a provider identity when the provider did not verify the e-mail', async () => {
    const { state, cookie } = await start('student');
    vi.mocked(prisma.user.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mockGoogleAccount({ id: 'manual-id', googleId: null, role: 'STUDENT' }));
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'google-test-token' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        sub: 'google-sub', email: 'teacher@example.com', email_verified: false, name: 'Teacher',
      })));
    const response = await request(app).get(`${base}/callback`)
      .set('Cookie', cookie.split(';')[0]).query({ code: 'test-code', state });
    expect(redirectOf(response).searchParams.get('google_error')).toBe('email_not_verified');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it.each(['missing', 'tampered'])('rejects %s state without contacting Google', async kind => {
    const { cookie, state } = await start();
    const req = request(app).get(`${base}/callback`).query({ code: 'test-code', state });
    if (kind === 'tampered') req.set('Cookie', cookie.split(';')[0] + 'bad');
    const response = await req;
    expect(redirectOf(response).pathname).toBe('/auth/google/callback');
    expect(redirectOf(response).searchParams.get('google_error')).toContain('invalid_state');
    expect(fetch).not.toHaveBeenCalled();
    expect(prisma.session.create).not.toHaveBeenCalled();
  });
});
describe('One account per person: social + e-mail password', () => {
  const providersUrl = '/api/v1/auth/providers';
  const setPasswordUrl = '/api/v1/auth/set-password';

  /** Runs a first social sign-in and returns the one-time setup token. */
  async function mintSetupToken() {
    const { state, cookie } = await start('student');
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(
      mockGoogleAccount({ id: 'shared-id', role: 'STUDENT', passwordHash: null, passwordSetAt: null }),
    );
    mockGoogle();
    const cb = await request(app).get(`${base}/callback`)
      .set('Cookie', cookie.split(';')[0]).query({ code: 'test-code', state });
    expect(redirectOf(cb).pathname).toBe('/auth/set-password');
    return redirectOf(cb).searchParams.get('token')!;
  }

  it('reports which social providers this deployment can actually sign in with', async () => {
    const res = await request(app).get(providersUrl);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ google: true, github: false, linkedin: false });
  });

  it('answers 503 for GitHub / LinkedIn until their app credentials exist', async () => {
    expect((await request(app).get('/api/v1/auth/github')).status).toBe(503);
    expect((await request(app).get('/api/v1/auth/linkedin')).status).toBe(503);
    // Apple was replaced by LinkedIn — its routes no longer exist.
    expect((await request(app).get('/api/v1/auth/apple')).status).toBe(404);
  });

  it.each([
    { passwordHash: null, passwordSetAt: null },
    { passwordHash: 'legacy-random-hash', passwordSetAt: null },
    { passwordHash: null, passwordSetAt: new Date('2026-01-01T00:00:00Z') },
  ])('requires password setup when credentials are incomplete: %j', async account => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(
      mockGoogleAccount(account),
    );
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'teacher@example.com', password: 'whatever' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('password-not-set');
    expect(prisma.session.create).not.toHaveBeenCalled();
  });

  it('saves the password once and enables e-mail sign-in on the same account', async () => {
    const setupToken = await mintSetupToken();
    // The setup token is single-purpose: it is not a session.
    const asSession = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${setupToken}`);
    expect(asSession.status).toBe(401);

    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      mockGoogleAccount({ id: 'shared-id', role: 'STUDENT', passwordHash: null, passwordSetAt: null }),
    );
    vi.mocked(prisma.user.update).mockResolvedValue(mockGoogleAccount({ id: 'shared-id', role: 'STUDENT' }));
    const saved = await request(app).post(setPasswordUrl).send({ token: setupToken, password: 'secret123' });

    expect(saved.status).toBe(200);
    expect(verifyToken(saved.body.token)).toEqual({ userId: 'shared-id' });
    expect(saved.body.user).toMatchObject({ id: 'shared-id', email: 'teacher@example.com', role: 'STUDENT' });
    const written = vi.mocked(prisma.user.update).mock.calls[0][0] as {
      data: { passwordHash?: string; passwordSetAt?: Date };
    };
    // Stored as a bcrypt hash, never the typed password.
    expect(written.data.passwordHash).not.toBe('secret123');
    expect(String(written.data.passwordHash)).toMatch(/^\$2[aby]\$/);
    expect(written.data.passwordSetAt).toBeInstanceOf(Date);

    // A session token can never be replayed to change a password.
    const replayed = await request(app)
      .post(setPasswordUrl)
      .send({ token: saved.body.token, password: 'another123' });
    expect(replayed.status).toBe(401);
    expect(replayed.body.error).toBe('link-expired');
  });

  it('refuses to overwrite a password that is already set', async () => {
    const setupToken = await mintSetupToken();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockGoogleAccount({ id: 'shared-id' }));
    const res = await request(app).post(setPasswordUrl).send({ token: setupToken, password: 'secret123' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('password-already-set');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects a forged or unrelated token and a too-short password', async () => {
    const forged = await request(app).post(setPasswordUrl).send({ token: 'not.a.real.token', password: 'secret123' });
    expect(forged.status).toBe(401);
    expect(forged.body.error).toBe('link-expired');

    const setupToken = await mintSetupToken();
    const weak = await request(app).post(setPasswordUrl).send({ token: setupToken, password: '123' });
    expect(weak.status).toBe(400);
    expect(weak.body.error).toBe('password-too-weak');
  });
});

