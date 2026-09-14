import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../../shared/services/api';
import { ROLE_HOME } from '../../../shared/lib/mockAuth';

/**
 * Handles the redirect back from Google OAuth (or any OAuth error).
 * The backend redirects to /auth/google/callback?token=<jwt> on success,
 * or /login?google_error=<reason> on failure. We persist the token,
 * refresh AuthProvider session state, then route straight into the
 * role dashboard (not the landing page).
 */
export default function GoogleCallback() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search ?? '');
    const token = params.get('token');
    const err = params.get('google_error');
    if (!token) {
      navigate(`/account-type${err ? `?google_error=${encodeURIComponent(err)}` : ''}`, { replace: true });
      return;
    }
    try {
      localStorage.setItem('lp-auth-token', token);
    } catch {
      /* ignore */
    }
    // One navigation only: resolve the real role, then hard-load the
    // dashboard so AuthProvider re-initializes from /auth/me on boot.
    api.auth
      .me()
      .then((me) => {
        const role = String((me as any)?.user?.role || 'student').toLowerCase() as keyof typeof ROLE_HOME;
        window.location.replace(ROLE_HOME[role] ?? '/dashboard');
      })
      .catch(() => {
        window.location.replace('/dashboard');
      });
  }, [location.search, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
      <div className="flex flex-col items-center gap-3">
        <span className="w-8 h-8 rounded-full border-2 border-surface-border border-t-brand animate-spin" />
        <p className="text-sm text-text-secondary">Signing you in with Google…</p>
      </div>
    </div>
  );
}