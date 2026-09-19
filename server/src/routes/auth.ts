import { Router, Request, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import { authMiddleware, signToken, verifyToken } from '../middleware/auth.js';
import { auditLogService, userService, inviteCodeService } from '../services/index.js';
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

// ─── One account per person: social + e-mail sign-in ─────────────────────────
// The verified provider e-mail is the shared identity. A social-first account is
// created *without* a site password and gets a short-lived, single-purpose token
// that is only good for `POST /auth/set-password`. The token is signed over
// `scope:payload`, so it can never be replayed as a session token (and a session
// token can never be used to set a password).
const SET_PASSWORD_SCOPE = 'set-password';
const SET_PASSWORD_TTL_MS = 15 * 60 * 1000;

const scopeSignature = (scope: string, payload: string) =>
  crypto.createHmac('sha256', process.env.SESSION_SECRET || 'dev-secret')
    .update(`${scope}:${payload}`)
    .digest('base64');

const signScopedToken = (userId: string, scope: string, ttlMs: number): string => {
  const payload = Buffer.from(JSON.stringify({ userId, scope, exp: Date.now() + ttlMs })).toString('base64');
  return `${payload}.${scopeSignature(scope, payload)}`;
};

const verifyScopedToken = (token: string, scope: string): string | null => {
  try {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;
    if (signature !== scopeSignature(scope, payload)) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString()) as {
      userId?: string; scope?: string; exp?: number;
    };
    if (decoded.scope !== scope || !decoded.userId) return null;
    if (typeof decoded.exp !== 'number' || decoded.exp < Date.now()) return null;
    return decoded.userId;
  } catch {
    return null;
  }
};

type SocialProvider = 'google' | 'github' | 'linkedin';

/** Row shape the shared social/e-mail resolution works with. */
interface SocialAccount {
  id: string;
  email: string;
  name: string;
  role: Role;
  locale: string;
  passwordHash: string | null;
  passwordSetAt: Date | null;
  googleId: string | null;
  githubId: string | null;
  linkedinId: string | null;
}

const SOCIAL_ID_FIELD: Record<SocialProvider, 'googleId' | 'githubId' | 'linkedinId'> = {
  google: 'googleId',
  github: 'githubId',
  linkedin: 'linkedinId',
};

/** Typed fragments so Prisma keeps full type-safety per provider. */
const providerIdWhere = (provider: SocialProvider, id: string) =>
  provider === 'google' ? { googleId: id } : provider === 'github' ? { githubId: id } : { linkedinId: id };
const providerIdData = (provider: SocialProvider, id: string) =>
  provider === 'google' ? { googleId: id } : provider === 'github' ? { githubId: id } : { linkedinId: id };
const storedProviderId = (user: SocialAccount, provider: SocialProvider) => user[SOCIAL_ID_FIELD[provider]];

interface SocialProfile {
  providerUserId: string;
  email: string;
  name: string;
  /** The provider vouched for this e-mail address (required to link identities). */
  emailVerified: boolean;
}

type SocialOutcome =
  | { kind: 'login'; user: SocialAccount }
  | { kind: 'set-password'; user: SocialAccount }
  | { kind: 'error'; reason: string };

/**
 * Resolves a social sign-in to the *single* database account for that person:
 * provider id first, then the verified e-mail. An existing account keeps its
 * role, its password and its Admin security code — the provider identity is only
 * attached to it. Accounts created this way start without a site password and
 * must set one before the dashboard opens.
 */
async function resolveSocialAccount(
  req: Request,
  provider: SocialProvider,
  profile: SocialProfile,
  requestedRole: string,
): Promise<SocialOutcome> {
  const prismaRole = Role[requestedRole.toUpperCase() as keyof typeof Role] || Role.STUDENT;
  // Elevated roles stay invite-only: no social provider mints an Admin, and an
  // Owner only keeps an Owner role that the account already had.
  const isElevated = prismaRole === Role.ADMIN || prismaRole === Role.OWNER;

  let user = (await prisma.user.findFirst({
    where: providerIdWhere(provider, profile.providerUserId),
  })) as SocialAccount | null;
  if (!user) {
    user = (await prisma.user.findFirst({ where: { email: profile.email } })) as SocialAccount | null;
  }

  if (user) {
    if (isElevated && (prismaRole === Role.ADMIN || String(user.role) !== String(Role.OWNER))) {
      return { kind: 'error', reason: 'role_requires_invite' };
    }
    if (!storedProviderId(user, provider)) {
      if (!profile.emailVerified) return { kind: 'error', reason: 'email_not_verified' };
      user = (await prisma.user.update({
        where: { id: user.id },
        data: providerIdData(provider, profile.providerUserId),
      })) as SocialAccount;
      void auditLogService.log({
        action: `user.oauth.link.${provider}`,
        targetType: 'user',
        targetId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') ?? undefined,
      });
    }
    // `passwordSetAt` is the real signal: it is written when the user chooses a
    // site password. Legacy social accounts carry a random, unknown hash from the
    // old flow, so they must still go through the one-time setup page.
    return user.passwordSetAt ? { kind: 'login', user } : { kind: 'set-password', user };
  }

  if (isElevated) return { kind: 'error', reason: 'role_requires_invite' };

  user = (await prisma.user.create({
    data: {
      email: profile.email,
      name: profile.name,
      role: prismaRole,
      locale: 'en',
      timezone: 'UTC',
      passwordHash: null,
      passwordSetAt: null,
      ...providerIdData(provider, profile.providerUserId),
    },
  })) as SocialAccount;
  void auditLogService.log({
    action: `user.signup.${provider}`,
    targetType: 'user',
    targetId: user.id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') ?? undefined,
    metadata: { requestedRole },
  });
  return { kind: 'set-password', user };
}

/** Issues a full session (used once the account has a site password). */
async function issueSession(user: SocialAccount) {
  await prisma.session.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + SESSION_MS) },
  });
  return signToken(user.id);
}

/**
 * Shared tail of every social callback: same database account for both sign-in
 * methods, and the password-setup page only for accounts without a password yet.
 */
async function finishSocialSignIn(
  req: Request,
  res: Response,
  provider: SocialProvider,
  requestedRole: string,
  profile: SocialProfile,
  fail: (reason: string) => void,
) {
  const outcome = await resolveSocialAccount(req, provider, profile, requestedRole);
  if (outcome.kind === 'error') return fail(outcome.reason);
  if (outcome.kind === 'set-password') {
    const setupToken = signScopedToken(outcome.user.id, SET_PASSWORD_SCOPE, SET_PASSWORD_TTL_MS);
    const params = new URLSearchParams({ token: setupToken, provider });
    return res.redirect(`${feOrigin()}/auth/set-password?${params.toString()}`);
  }
  const token = await issueSession(outcome.user);
  void auditLogService.log({
    action: `user.login.${provider}`,
    targetType: 'user',
    targetId: outcome.user.id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') ?? undefined,
  });
  res.redirect(`${feOrigin()}/auth/google/callback?token=${encodeURIComponent(token)}`);
}


router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, locale, timezone, inviteCode } = req.body;
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'validation' });
    }
    if (role === 'owner') {
      return res.status(403).json({ error: 'role_requires_invite' });
    }
    const allowedRoles = ['student', 'teacher', 'admin', 'parent'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'validation' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'password-too-weak' });
    }
    // Admin accounts are invite-only: the Owner issues a code (default fixed
    // code = ADMIN_INVITE_CODE, "Ahmed") and the code must be valid + unused.
    let adminInvite: { id: string; code: string } | null = null;
    if (role === 'admin') {
      if (typeof inviteCode !== 'string' || !inviteCode.trim()) {
        return res.status(400).json({ error: 'invite-code-required' });
      }
      const invite = await inviteCodeService.findUsable(inviteCode, Role.ADMIN);
      if (!invite) {
        return res.status(403).json({ error: 'invalid-invite-code' });
      }
      adminInvite = { id: invite.id, code: invite.code };
    }
    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'email-taken' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        // A manually created account already knows its site password.
        passwordSetAt: new Date(),
        name,
        role: role.toUpperCase() as Role,
        locale: locale || 'en',
        timezone: timezone || 'UTC',
        // The security code travels with the account so the Owner can audit
        // which invite onboarded which admin.
        ...(adminInvite
          ? {
              inviteCodeId: adminInvite.id,
              securityCodeHash: await bcrypt.hash(adminInvite.code.trim(), 10),
            }
          : {}),
      },
    });
    if (adminInvite) {
      await inviteCodeService.redeem(adminInvite.id);
    }
    const session = await prisma.session.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() + SESSION_MS) },
    });
    const token = signToken(user.id);
    void auditLogService.log({
      action: adminInvite ? 'user.signup.admin-invite' : 'user.signup',
      targetType: 'user',
      targetId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
      metadata: adminInvite
        ? { role, inviteCodeId: adminInvite.id, inviteCode: adminInvite.code }
        : { role },
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
    const { email, password, inviteCode } = req.body;
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
    // Social-first accounts have no site password yet, so a manual sign-in must
    // say so instead of a misleading "invalid credentials".
    if (!user.passwordSetAt || !user.passwordHash) {
      return res.status(409).json({ error: 'password-not-set' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'invalid-credentials' });
    }
    // Admin sign-in is invite-gated: email + password + the security/invite code
    // the Owner issued. The code the account was onboarded with is stored as a
    // bcrypt hash (securityCodeHash). Legacy admin rows without a stored hash
    // can bind on first login with any still-usable code.
    if (user.role === Role.ADMIN) {
      const code = typeof inviteCode === 'string' ? inviteCode.trim() : '';
      if (!code) {
        return res.status(400).json({ error: 'invite-code-required' });
      }
      const stored = user as unknown as { securityCodeHash: string | null; inviteCodeId: string | null };
      if (stored.securityCodeHash) {
        const ok = await inviteCodeService.matchesStoredSecurityCode(
          { securityCodeHash: stored.securityCodeHash },
          code,
        );
        if (!ok) {
          return res.status(403).json({ error: 'invalid-invite-code' });
        }
      } else {
        const invite = await inviteCodeService.findUsable(code, Role.ADMIN);
        if (!invite) {
          return res.status(403).json({ error: 'invalid-invite-code' });
        }
        await inviteCodeService.bindToUser(user.id, { id: invite.id }, invite.code);
        await inviteCodeService.redeem(invite.id);
        void auditLogService.log({
          action: 'user.login.admin-invite-bind',
          targetType: 'user',
          targetId: user.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') ?? undefined,
          metadata: { inviteCodeId: invite.id, inviteCode: invite.code },
        });
      }
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

// Which social providers are actually configured on this deployment. The login
// page uses this so it never sends the user into a dead-end redirect.
router.get('/providers', (_req: Request, res: Response) => {
  res.json({
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    linkedin: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
  });
});

// POST /api/v1/auth/set-password — once per account, after the first social
// sign-in. The single-purpose token cannot be used as a session, and an account
// that already has a password refuses to be overwritten through this route.
router.post('/set-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (typeof token !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'validation' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'password-too-weak' });
    }
    const userId = verifyScopedToken(token, SET_PASSWORD_SCOPE);
    if (!userId) return res.status(401).json({ error: 'link-expired' });
    const user = (await prisma.user.findUnique({ where: { id: userId } })) as SocialAccount | null;
    if (!user) return res.status(404).json({ error: 'not-found' });
    // One-time only: a password the user chose earlier is never overwritten here.
    // (Legacy social accounts still hold a random hash with `passwordSetAt` null,
    // so this is their one chance to pick a password they actually know.)
    if (user.passwordSetAt) {
      return res.status(409).json({ error: 'password-already-set' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const updated = (await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordSetAt: new Date() },
    })) as SocialAccount;
    const sessionToken = await issueSession(updated);
    void auditLogService.log({
      action: 'user.password.set',
      targetType: 'user',
      targetId: updated.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
    });
    res.json({
      token: sessionToken,
      user: { id: updated.id, email: updated.email, name: updated.name, role: updated.role, locale: updated.locale },
    });
  } catch (e) {
    console.error('Set-password error:', e);
    res.status(400).json({ error: 'validation' });
  }
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
// FRONTEND_URL wins; CORS_ORIGIN may be a comma-separated list, and the OAuth
// redirect must point at exactly one origin — so take its first entry.
const feOrigin = () =>
  process.env.FRONTEND_URL ||
  (process.env.CORS_ORIGIN || '').split(',')[0]?.trim() ||
  'http://localhost:3000';
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
  const requestedRole = req.query.role;
  if (requestedRole !== undefined &&
      (typeof requestedRole !== 'string' || !['student', 'teacher', 'admin', 'owner'].includes(requestedRole))) {
    return res.status(400).json({ error: 'invalid-role' });
  }
  // Bind the selected role to this signed OAuth attempt, not a separate cookie.
  const state = `${crypto.randomBytes(16).toString('hex')}:${requestedRole || ''}`;
  // Stateless CSRF state stored in a signed HttpOnly cookie so it survives restarts.
  res.cookie(OAUTH_STATE_COOKIE, `${state}.${signState(state)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 10 * 60 * 1000, // 10 minutes — Express expects milliseconds
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
    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
    console.log(`[google-oauth] callback failed => ${reason}`);
    res.redirect(`${feOrigin()}/auth/google/callback?google_error=${encodeURIComponent(reason)}`);
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
  // The requested role was bound into the signed state at the start step —
  // it cannot be forged from the callback URL.
  const LOGIN_ROLES = ['student', 'teacher', 'admin', 'owner'];
  const colon = state.indexOf(':');
  const requestedRole = colon >= 0 ? state.slice(colon + 1) : 'student';
  const safeRole = LOGIN_ROLES.includes(requestedRole) && requestedRole !== '' ? requestedRole : 'student';

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
    const profile = (await uiRes.json()) as {
      sub?: string; email?: string; email_verified?: boolean; name?: string; given_name?: string;
    };

    const email = String(profile.email || '').toLowerCase();
    if (!email) return fail('no_email');
    const name = profile.name || profile.given_name || email.split('@')[0] || 'Google User';
    // Google only returns verified addresses here; `sub` is the stable provider id.
    const emailVerified = profile.email_verified !== false;

    // The signed `safeRole` (chosen before the OAuth redirect, verified against
    // the HMAC state) decides the login role — same policy as POST /signup, and
    // it cannot be forged from the callback URL. It only applies to accounts this
    // sign-in creates; an existing account keeps its own role.
    await finishSocialSignIn(
      req,
      res,
      'google',
      safeRole,
      { providerUserId: String(profile.sub || email), email, name, emailVerified },
      fail,
    );
  } catch (e) {
    console.error('Google callback error:', e);
    fail('server_error');
  }
});

// ─── GitHub OAuth 2.0 ─────────────────────────────────────────────────────────
const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';
const githubRedirectUri = () =>
  process.env.GITHUB_CALLBACK_URL || `${apiBase()}/api/v1/auth/github/callback`;

router.get('/github', async (req: Request, res: Response) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId || !process.env.GITHUB_CLIENT_SECRET) {
    return res.status(503).json({
      error: 'github-oauth-not-configured',
      hint: 'Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in server/.env',
    });
  }
  const requestedRole = req.query.role;
  if (requestedRole !== undefined &&
      (typeof requestedRole !== 'string' || !['student', 'teacher', 'admin', 'owner'].includes(requestedRole))) {
    return res.status(400).json({ error: 'invalid-role' });
  }
  const state = `${crypto.randomBytes(16).toString('hex')}:${requestedRole || ''}`;
  res.cookie(OAUTH_STATE_COOKIE, `${state}.${signState(state)}`, {
    httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: 10 * 60 * 1000,
  });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: githubRedirectUri(),
    scope: 'read:user user:email',
    state,
  });
  res.redirect(`${GITHUB_AUTH_URL}?${params.toString()}`);
});

router.get('/github/callback', async (req: Request, res: Response) => {
  const fail = (reason: string) => {
    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
    console.log(`[github-oauth] callback failed => ${reason}`);
    res.redirect(`${feOrigin()}/auth/google/callback?google_error=${encodeURIComponent(reason)}`);
  };
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const oauthError = req.query.error as string | undefined;
  if (oauthError) return fail(`oauth_error:${oauthError}`);
  if (!code || !state) return fail('missing_params');
  const rawCookie = String((req.cookies && req.cookies[OAUTH_STATE_COOKIE]) || '');
  const dot = rawCookie.indexOf('.');
  const cookieState = dot >= 0 ? rawCookie.slice(0, dot) : '';
  const cookieSig = dot >= 0 ? rawCookie.slice(dot + 1) : '';
  const stateOk = cookieState === state && cookieSig === signState(state) && cookieSig.length > 0;
  res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
  if (!stateOk) return fail('invalid_state');

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail('not_configured');

  const LOGIN_ROLES = ['student', 'teacher', 'admin', 'owner'];
  const colon = state.indexOf(':');
  const requestedRole = colon >= 0 ? state.slice(colon + 1) : 'student';
  const safeRole = LOGIN_ROLES.includes(requestedRole) && requestedRole !== '' ? requestedRole : 'student';

  try {
    const tokenRes = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: clientId, client_secret: clientSecret, code, redirect_uri: githubRedirectUri(),
      }),
    });
    if (!tokenRes.ok) {
      console.error('GitHub token exchange failed:', await tokenRes.text());
      return fail('token_exchange');
    }
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) return fail('token_exchange');
    const ghHeaders = {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'LearnPilot',
    };

    const userRes = await fetch(GITHUB_USER_URL, { headers: ghHeaders });
    if (!userRes.ok) return fail('userinfo');
    const ghUser = (await userRes.json()) as { id?: number; login?: string; name?: string; email?: string | null };

    // GitHub hides the address unless it is public, so ask for the verified
    // primary one explicitly — that is the identity we may link on.
    let email = String(ghUser.email || '').toLowerCase();
    let emailVerified = !!email;
    if (!email) {
      const emailsRes = await fetch(GITHUB_EMAILS_URL, { headers: ghHeaders });
      if (emailsRes.ok) {
        const emails = (await emailsRes.json()) as { email?: string; primary?: boolean; verified?: boolean }[];
        const primary = Array.isArray(emails)
          ? emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified)
          : undefined;
        email = String(primary?.email || '').toLowerCase();
        emailVerified = !!primary;
      }
    }
    if (!email) return fail('no_email');
    if (!emailVerified) return fail('email_not_verified');
    const name = ghUser.name || ghUser.login || email.split('@')[0] || 'GitHub User';

    await finishSocialSignIn(
      req, res, 'github', safeRole,
      { providerUserId: String(ghUser.id || email), email, name, emailVerified },
      fail,
    );
  } catch (e) {
    console.error('GitHub callback error:', e);
    fail('server_error');
  }
});

// ─── LinkedIn Sign in (OpenID Connect) ────────────────────────────────────────
// LinkedIn uses plain OAuth 2.0 + the OIDC `openid profile email` scopes. The
// `email_verified` claim on /v2/userinfo is what lets us link the identity to
// the one account per person. Until LINKEDIN_CLIENT_ID/SECRET exist the start
// route answers with a clear 503, so the UI never redirects into a dead end.
const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
const linkedinRedirectUri = () =>
  process.env.LINKEDIN_CALLBACK_URL || `${apiBase()}/api/v1/auth/linkedin/callback`;

router.get('/linkedin', (req: Request, res: Response) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId || !process.env.LINKEDIN_CLIENT_SECRET) {
    return res.status(503).json({
      error: 'linkedin-oauth-not-configured',
      hint: 'Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in server/.env',
    });
  }
  const requestedRole = req.query.role;
  if (requestedRole !== undefined &&
      (typeof requestedRole !== 'string' || !['student', 'teacher', 'admin', 'owner'].includes(requestedRole))) {
    return res.status(400).json({ error: 'invalid-role' });
  }
  const state = `${crypto.randomBytes(16).toString('hex')}:${requestedRole || ''}`;
  res.cookie(OAUTH_STATE_COOKIE, `${state}.${signState(state)}`, {
    httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: 10 * 60 * 1000,
  });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: linkedinRedirectUri(),
    response_type: 'code',
    scope: 'openid profile email',
    state,
  });
  res.redirect(`${LINKEDIN_AUTH_URL}?${params.toString()}`);
});

router.get('/linkedin/callback', async (req: Request, res: Response) => {
  const fail = (reason: string) => {
    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
    console.log(`[linkedin-oauth] callback failed => ${reason}`);
    res.redirect(`${feOrigin()}/auth/google/callback?google_error=${encodeURIComponent(reason)}`);
  };
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const oauthError = req.query.error as string | undefined;
  if (oauthError) return fail(`oauth_error:${oauthError}`);
  if (!code || !state) return fail('missing_params');
  const rawCookie = String((req.cookies && req.cookies[OAUTH_STATE_COOKIE]) || '');
  const dot = rawCookie.indexOf('.');
  const cookieState = dot >= 0 ? rawCookie.slice(0, dot) : '';
  const cookieSig = dot >= 0 ? rawCookie.slice(dot + 1) : '';
  const stateOk = cookieState === state && cookieSig === signState(state) && cookieSig.length > 0;
  res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
  if (!stateOk) return fail('invalid_state');

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail('not_configured');

  const LOGIN_ROLES = ['student', 'teacher', 'admin', 'owner'];
  const colon = state.indexOf(':');
  const requestedRole = colon >= 0 ? state.slice(colon + 1) : 'student';
  const safeRole = LOGIN_ROLES.includes(requestedRole) && requestedRole !== '' ? requestedRole : 'student';

  try {
    const tokenRes = await fetch(LINKEDIN_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code', code,
        client_id: clientId, client_secret: clientSecret,
        redirect_uri: linkedinRedirectUri(),
      }),
    });
    if (!tokenRes.ok) {
      console.error('LinkedIn token exchange failed:', await tokenRes.text());
      return fail('token_exchange');
    }
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) return fail('token_exchange');

    const userinfoRes = await fetch(LINKEDIN_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userinfoRes.ok) {
      console.error('LinkedIn userinfo failed:', await userinfoRes.text());
      return fail('userinfo');
    }
    const profile = (await userinfoRes.json()) as {
      sub?: string; name?: string; email?: string; email_verified?: boolean;
    };
    const email = String(profile.email || '').toLowerCase();
    if (!email) return fail('no_email');
    if (!profile.email_verified) return fail('email_not_verified');
    const name = profile.name || email.split('@')[0] || 'LinkedIn User';

    await finishSocialSignIn(
      req, res, 'linkedin', safeRole,
      { providerUserId: String(profile.sub || email), email, name, emailVerified: true },
      fail,
    );
  } catch (e) {
    console.error('LinkedIn callback error:', e);
    fail('server_error');
  }
});

export default router;