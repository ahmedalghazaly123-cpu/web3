import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../../shared/services/api';
import { ROLE_HOME } from '../../../shared/lib/mockAuth';

/**
 * Handles the redirect back from Google OAuth (or any OAuth error).
 * The backend redirects to /auth/google/callback?token=<jwt> on success,
 * or the same page with ?google_error=<reason> on failure. We persist the token,
 * refresh AuthProvider session state, then route straight into the
 * role dashboard (not the landing page).
 */
export default function GoogleCallback() {
  const location = useLocation();
  const { t } = useTranslation('auth');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search ?? '');
    const token = params.get('token');
    const err = params.get('google_error');
    if (err || !token) {
      const roleMismatch = err?.startsWith('role_mismatch:') ? err.split(':')[1] : null;
      setError(
        err?.startsWith('invalid_state') ? 'googleExpired'
        : err === 'oauth_error:access_denied' ? 'googleCancelled'
        : err === 'role_requires_invite' ? 'googleRoleInvite'
        : roleMismatch ? `googleRoleMismatch_${roleMismatch}`
        : 'googleFailed',
      );
      return;
    }
    let active = true;
    try {
      localStorage.setItem('lp-auth-token', token);
    } catch {
      setError('googleFailed');
      return;
    }
    // One navigation only: resolve the real role, then hard-load the
    // dashboard so AuthProvider re-initializes from /auth/me on boot.
    api.auth
      .me()
      .then((me) => {
        if (!active) return;
        const role = String((me as { user?: { role?: string } })?.user?.role || '').toLowerCase();
        if (!Object.prototype.hasOwnProperty.call(ROLE_HOME, role)) {
          setError('googleFailed');
          return;
        }
        window.location.replace(ROLE_HOME[role as keyof typeof ROLE_HOME]);
      })
      .catch(() => {
        if (active) setError('googleFailed');
      });
    return () => { active = false; };
  }, [location.search]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
      <div className="flex flex-col items-center gap-3">
        {error ? (
          <>
            <p role="alert" className="text-sm text-text-secondary text-center px-4">{t(error)}</p>
            <Link to="/account-type" className="text-brand font-semibold">{t('resetCancel')}</Link>
          </>
        ) : (
          <>
            <span className="w-8 h-8 rounded-full border-2 border-surface-border border-t-brand animate-spin" />
            <p className="text-sm text-text-secondary">{t('signingIn')}</p>
          </>
        )}
      </div>
    </div>
  );
}