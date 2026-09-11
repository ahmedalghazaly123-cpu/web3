// Mock authentication session for development.
// In production, this comes from the backend API — the frontend never
// invents or escalates roles. `role` is fixed at login and read-only after.
//
// Session shape: { authenticated: true, role, user }
import type { UserRole } from '../../app/types';

export const AUTH_ROLES: UserRole[] = ['student', 'teacher', 'admin', 'owner'];

export const ROLE_HOME: Record<UserRole, string> = {
  student: '/dashboard',
  teacher: '/teacher',
  admin: '/admin',
  owner: '/owner',
};

const USER_KEY = 'user';

export interface MockUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  language: 'en' | 'ar';
  theme: 'light' | 'dark' | 'system';
}

export interface MockSession {
  authenticated: boolean;
  role: UserRole;
  user: MockUser | null;
}

export function isRole(value: unknown): value is UserRole {
  return value === 'student' || value === 'teacher' || value === 'admin' || value === 'owner';
}

const MOCK_PROFILES: Record<UserRole, MockUser> = {
  student: { id: 'student-001', name: 'Ahmed Hassan', email: 'ahmed.hassan@example.com', avatar: '/avatars/student.svg', role: 'student', language: 'en', theme: 'system' },
  teacher: { id: 'teacher-001', name: 'Sara Mahmoud', email: 'sara.mahmoud@example.com', avatar: '/avatars/instructor-1.svg', role: 'teacher', language: 'en', theme: 'system' },
  admin: { id: 'admin-001', name: 'Omar Khaled', email: 'omar.khaled@example.com', avatar: '/avatars/instructor-3.svg', role: 'admin', language: 'en', theme: 'system' },
  owner: { id: 'owner-001', name: 'Layla Ibrahim', email: 'layla.ibrahim@example.com', avatar: '/avatars/student.svg', role: 'owner', language: 'en', theme: 'system' },
};

/**
 * Ready-to-use demo accounts — one per role. Shown on each role login page
 * so you can sign in with one click (no backend needed). The demo password
 * is accepted for these e-mails by `mockSignInWithPassword`.
 */
export const DEMO_CREDENTIALS: Record<UserRole, { email: string; password: string; name: string }> = {
  student: { email: 'student@learnpilot.dev', password: 'student123', name: 'Ahmed Hassan' },
  teacher: { email: 'teacher@learnpilot.dev', password: 'teacher123', name: 'Sara Mahmoud' },
  admin: { email: 'admin@learnpilot.dev', password: 'admin123', name: 'Omar Khaled' },
  owner: { email: 'owner@learnpilot.dev', password: 'owner123', name: 'Layla Ibrahim' },
};

export interface SignInResult {
  ok: boolean;
  session: MockSession | null;
  error?: 'invalid-credentials' | 'validation';
}

/** Do NOT auto-create a session. Absence of a session = logged out. */
export function initMockAuth() {
  if (!localStorage.getItem('language')) {
    localStorage.setItem('language', 'en');
  }
}

export interface SignUpResult {
  ok: boolean;
  session: MockSession | null;
  error?: 'email-taken' | 'validation';
}

/**
 * Mock sign-up: creates a NEW fixed-role account (stored in a local
 * registry) and signs it in immediately. E-mail must be unique per role.
 */
export function mockSignUp(role: UserRole, name: string, email: string): SignUpResult {
  const cleanName = name.trim();
  const cleanEmail = email.trim();
  if (cleanName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { ok: false, session: null, error: 'validation' };
  }
  const key = registryKey(role, cleanEmail);
  const reg = readRegistry();
  if (reg[key] || MOCK_PROFILES[role].email.toLowerCase() === cleanEmail.toLowerCase()) {
    return { ok: false, session: null, error: 'email-taken' };
  }
  const user: MockUser = {
    id: `${role}-${Date.now().toString(36)}`,
    name: cleanName,
    email: cleanEmail,
    avatar: MOCK_PROFILES[role].avatar,
    role,
    language: 'en',
    theme: 'system',
  };
  reg[key] = user;
  writeRegistry(reg);
  const session = mockSignIn(role, { email: user.email, name: user.name });
  return { ok: true, session };
}

/**
 * Mock password sign-in. Accepts:
 * 1. the role's demo account (DEMO_CREDENTIALS), or
 * 2. any e-mail previously registered via mockSignUp (any 6+ char password).
 * Anything else → invalid-credentials.
 */
export function mockSignInWithPassword(role: UserRole, email: string, _password: string): SignInResult {
  const cleanEmail = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { ok: false, session: null, error: 'validation' };
  }
  const demo = DEMO_CREDENTIALS[role];
  const emailMatch = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  if (emailMatch(cleanEmail, demo.email)) {
    if (_password === demo.password) {
      return { ok: true, session: mockSignIn(role, { email: demo.email, name: demo.name }) };
    }
    return { ok: false, session: null, error: 'invalid-credentials' };
  }
  const registered = readRegistry()[registryKey(role, cleanEmail)];
  if (registered) {
    return { ok: true, session: mockSignIn(role, { email: registered.email, name: registered.name }) };
  }
  return { ok: false, session: null, error: 'invalid-credentials' };
}

/** Mock social sign-in (Google / GitHub / Apple): instant, fixed-role session. */
export function mockSocialSignIn(role: UserRole, provider: 'google' | 'github' | 'apple'): MockSession {
  const base = MOCK_PROFILES[role];
  const session = mockSignIn(role, { email: base.email, name: base.name });
  // Record provider for dev clarity without breaking the session shape.
  try {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.id = `${base.id}+${provider}`;
      localStorage.setItem(USER_KEY, JSON.stringify(parsed));
      if (session.user) session.user.id = parsed.id;
    }
  } catch {
    // ignore — session already created
  }
  return session;
}

export function getDemoCredentials(role: UserRole): { email: string; password: string; name: string } {
  return { ...DEMO_CREDENTIALS[role] };
}

const REGISTRY_KEY = 'lp-registered-users';

function readRegistry(): Record<string, MockUser> {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeRegistry(reg: Record<string, MockUser>) {
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg));
  } catch {
    // storage unavailable — ignore
  }
}

function registryKey(role: UserRole, email: string) {
  return `${role}:${email.trim().toLowerCase()}`;
}

/** Create a session for the role chosen in the pre-login flow. Role is fixed from here on. */
export function mockSignIn(role: UserRole, overrides?: Partial<MockUser>): MockSession {
  const base = MOCK_PROFILES[role];
  // Prefer a previously registered profile (same role + email) so the
  // user's chosen display name survives across logins.
  let registered: MockUser | undefined;
  try {
    if (overrides?.email) registered = readRegistry()[registryKey(role, overrides.email)];
  } catch {
    registered = undefined;
  }
  const user: MockUser = { ...(registered ?? base), ...overrides, role, id: (registered ?? base).id };
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // storage unavailable — session still returned in-memory
  }
  // Notify RoleProvider (same-tab; storage events only fire cross-tab)
  try {
    window.dispatchEvent(new StorageEvent('storage', { key: USER_KEY }));
  } catch {
    // non-browser or old engine — ignore
  }
  return { authenticated: true, role, user };
}

/** Read the current session. Returns unauthenticated when logged out. */
export function getMockSession(): MockSession {
  try {
    const stored = localStorage.getItem(USER_KEY);
    if (!stored) return { authenticated: false, role: 'student', user: null };
    const parsed = JSON.parse(stored) as Partial<MockUser>;
    if (!isRole(parsed.role)) return { authenticated: false, role: 'student', user: null };
    return { authenticated: true, role: parsed.role, user: parsed as MockUser };
  } catch {
    return { authenticated: false, role: 'student', user: null };
  }
}

export function getMockUser(): MockUser | null {
  return getMockSession().user;
}

export function clearMockAuth() {
  localStorage.removeItem(USER_KEY);
  try {
    window.dispatchEvent(new StorageEvent('storage', { key: USER_KEY }));
  } catch {
    // ignore
  }
}

