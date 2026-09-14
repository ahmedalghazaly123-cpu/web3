import { Router, Request, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import { authMiddleware, signToken, verifyToken } from '../middleware/auth.js';
import { auditLogService, userService } from '../services/index.js';
import { prisma } from '../lib/prisma.js';
import crypto from 'crypto';

const router = Router();

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, locale, timezone } = req.body;
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'validation' });
    }
    const allowedRoles = ['student', 'teacher', 'admin', 'owner', 'parent'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'validation' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'password-too-weak' });
    }
    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'email-taken' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name, role: role.toUpperCase() as Role, locale: locale || 'en', timezone: timezone || 'UTC' },
    });
    const session = await prisma.session.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() + SESSION_MS) },
    });
    const token = signToken(user.id);
    void auditLogService.log({
      action: 'user.signup',
      targetType: 'user',
      targetId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
      metadata: { role },
    });
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, locale: user.locale },
    });
  } catch (e) {
    console.error('Signup error:', e);
    res.status(400).json({ error: 'validation' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'validation' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'validation' });
    }
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'invalid-credentials' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'invalid-credentials' });
    }
    const session = await prisma.session.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() + SESSION_MS) },
    });
    const token = signToken(user.id);
    void auditLogService.log({
      action: 'user.login',
      targetType: 'user',
      targetId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
    });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, locale: user.locale },
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(400).json({ error: 'validation' });
  }
});

router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const payload = verifyToken(token);
      if (payload) {
        await prisma.session.deleteMany({ where: { userId: payload.userId } });
        void auditLogService.log({
          action: 'user.logout',
          targetType: 'user',
          targetId: payload.userId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') ?? undefined,
        });
      }
    } catch { /* ignore */ }
  }
  res.json({ ok: true });
});

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, locale: true, timezone: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: 'not-found' });
  res.json({ user });
});

// ─── Google OAuth 2.0 ──────────────────────────────────────────────────────────
// Activates automatically when GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set in
// server/.env. Without them, the start endpoint returns a clear 503 message.
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const GOOGLE_SCOPES = 'openid email profile';
const OAUTH_STATE_COOKIE = 'lp_oauth_state';
const signState = (value: string) =>
  crypto.createHmac('sha256', process.env.SESSION_SECRET || 'dev-secret').update(value).digest('hex');
const apiBase = () => process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 4000}`;
const feOrigin = () => process.env.CORS_ORIGIN || 'http://localhost:3000';
const googleRedirectUri = () => process.env.GOOGLE_CALLBACK_URL || `${apiBase()}/api/v1/auth/google/callback`;

// GET /api/v1/auth/google — start the OAuth flow (302 redirect to Google)
router.get('/google', async (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      error: 'google-oauth-not-configured',
      hint: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in server/.env',
    });
  }
  const state = crypto.randomBytes(16).toString('hex');
  // Stateless CSRF state stored in a signed HttpOnly cookie so it survives restarts.
  res.cookie(OAUTH_STATE_COOKIE, `${state}.${signState(state)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 600,
  });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    state,
    prompt: 'select_account',
  });
  res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
});

// GET /api/v1/auth/google/callback — exchange code, upsert user, issue session
router.get('/google/callback', async (req: Request, res: Response) => {
  const fail = (reason: string) => {
    console.log(`[google-oauth] callback failed => ${reason}`);
    res.redirect(`${feOrigin()}/login?google_error=${encodeURIComponent(reason)}`);
  };
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const oauthError = req.query.error as string | undefined;
  if (oauthError) return fail(`oauth_error:${oauthError}`);
  if (!code || !state) return fail('missing_params');
  // Verify the signed state cookie (stateless, survives restarts).
  const rawCookie = String((req.cookies && req.cookies[OAUTH_STATE_COOKIE]) || '');
  const dot = rawCookie.indexOf('.');
  const cookieState = dot >= 0 ? rawCookie.slice(0, dot) : '';
  const cookieSig = dot >= 0 ? rawCookie.slice(dot + 1) : '';
  const stateOk = cookieState === state && cookieSig === signState(state) && cookieSig.length > 0;
  res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
  if (!stateOk) return fail(`invalid_state (expected=${cookieState.length} got=${state.length})`);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail('not_configured');

  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: googleRedirectUri(),
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) {
      console.error('Google token exchange failed:', await tokenRes.text());
      return fail('token_exchange');
    }
    const tokenData = (await tokenRes.json()) as { access_token: string };

    const uiRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!uiRes.ok) return fail('userinfo');
    const profile = (await uiRes.json()) as { email?: string; name?: string; given_name?: string };

    const email = String(profile.email || '').toLowerCase();
    if (!email) return fail('no_email');
    const name = profile.name || profile.given_name || email.split('@')[0] || 'Google User';

    let user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
      user = await prisma.user.create({
        data: { email, passwordHash, name, role: Role.STUDENT, locale: 'en', timezone: 'UTC' },
      });
      void auditLogService.log({
        action: 'user.signup.google',
        targetType: 'user',
        targetId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') ?? undefined,
      });
    }
    const session = await prisma.session.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() + SESSION_MS) },
    });
    const token = signToken(user.id);
    void auditLogService.log({
      action: 'user.login.google',
      targetType: 'user',
      targetId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
    });
    res.redirect(`${feOrigin()}/auth/google/callback?token=${encodeURIComponent(token)}`);
  } catch (e) {
    console.error('Google callback error:', e);
    fail('server_error');
  }
});

export default router;