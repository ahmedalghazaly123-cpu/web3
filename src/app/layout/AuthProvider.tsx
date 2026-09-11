import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { UserRole } from '../types';
import { api } from '../../shared/services/api';
import { learningSync } from '../../shared/services/learningSync';

export type { UserRole } from '../types';

interface AuthContextValue {
  authenticated: boolean;
  role: UserRole;
  user: { id: string; email: string; name: string; role: UserRole } | null;
  login: (role: UserRole, email: string, password: string) => Promise<boolean>;
  signup: (role: UserRole, name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(() => {
    try {
      return typeof localStorage !== 'undefined' && !!localStorage.getItem('lp-auth-token');
    } catch {
      return false;
    }
  });
  const [role, setRole] = useState<UserRole>('student');
  const [user, setUser] = useState<AuthContextValue['user']>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const me = await api.auth.me();
        const u = (me as any).user as AuthContextValue['user'] | undefined;
        if (u) {
          setAuthenticated(true);
          setRole((u.role || 'student').toLowerCase() as UserRole);
          setUser(u);
          // Hydrate authoritative learning state from the backend (cache only).
          void learningSync.hydrate(u.id);
        }
      } catch {
        setAuthenticated(false);
        setUser(null);
      }
    };
    init();
  }, []);

  const login = async (role: UserRole, email: string, password: string): Promise<boolean> => {
    try {
      const res = await api.auth.login({ email, password });
      const token = (res as any).token;
      const user = (res as any).user as AuthContextValue['user'] | undefined;
      if (token && user) {
        localStorage.setItem('lp-auth-token', token);
        setAuthenticated(true);
        setRole((user.role || role).toLowerCase() as UserRole);
        setUser(user);
        void learningSync.hydrate(user.id);
        return true;
      }
    } catch {
      if (process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true') {
        const { mockSignInWithPassword } = await import('../../shared/lib/mockAuth');
        const result = mockSignInWithPassword(role, email, password);
        if (result.ok && result.session?.authenticated && result.session.user) {
          setAuthenticated(true);
          setRole(result.session.role);
          setUser(result.session.user);
        return true;
      }
      }
    }
    return false;
  };

  const signup = async (role: UserRole, name: string, email: string, password: string): Promise<boolean> => {
    try {
      const res = await api.auth.signup({ email, password, name, role });
      const token = (res as any).token;
      const user = (res as any).user as AuthContextValue['user'] | undefined;
      if (token && user) {
        localStorage.setItem('lp-auth-token', token);
        setAuthenticated(true);
        setRole((user.role || role).toLowerCase() as UserRole);
        setUser(user);
        void learningSync.hydrate(user.id);
        return true;
      }
    } catch {
      if (process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true') {
        const { mockSignUp } = await import('../../shared/lib/mockAuth');
        const result = mockSignUp(role, name, email);
        if (result.ok && result.session?.authenticated && result.session.user) {
          setAuthenticated(true);
          setRole(result.session.role);
          setUser(result.session.user);
        return true;
      }
      }
    }
    return false;
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem('lp-auth-token');
    setAuthenticated(false);
    setRole('student');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ authenticated, role, user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
