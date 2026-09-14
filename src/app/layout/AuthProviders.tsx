import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { getDirection } from '../../i18n';
import { useTranslation } from 'react-i18next';
import type { UserRole } from '../types';
import { useAuth } from './AuthProvider';

export function DirectionUpdater() {
  const { i18n } = useTranslation();
  useEffect(() => {
    const dir = getDirection(i18n.language);
    const html = document.documentElement;
    html.dir = dir;
    html.lang = i18n.language;
    html.classList.toggle('arabic', dir === 'rtl');
  }, [i18n.language]);
  return null;
}

export function RequireAuth() {
  const location = useLocation();
  const { authenticated, ready } = useAuth();
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <span className="w-8 h-8 rounded-full border-2 border-surface-border border-t-brand animate-spin" />
      </div>
    );
  }
  if (!authenticated) {
    return <Navigate to="/account-type" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
}

export function RequireRole({ allowed }: { allowed: UserRole[] }) {
  const { authenticated, ready, role } = useAuth();
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <span className="w-8 h-8 rounded-full border-2 border-surface-border border-t-brand animate-spin" />
      </div>
    );
  }
  if (!authenticated) {
    return <Navigate to="/account-type" replace />;
  }
  if (!allowed.includes(role)) {
    const home: Record<string, string> = {
      student: '/dashboard',
      teacher: '/teacher',
      admin: '/admin',
      owner: '/owner',
    };
    return <Navigate to={home[role] ?? '/dashboard'} replace />;
  }
  return <Outlet />;
}

export function isLoginRole(value: string | undefined): value is UserRole {
  return value === 'student' || value === 'teacher' || value === 'admin' || value === 'owner';
}
