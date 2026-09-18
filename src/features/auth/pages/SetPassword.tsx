import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, BrainCircuit, Eye, EyeOff, KeyRound } from 'lucide-react';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { LanguageSwitcher } from '../../../shared/components/ui/LanguageSwitcher';
import { ROLE_HOME } from '../../../shared/lib/mockAuth';
import type { UserRole } from '../../../app/types';
import { api } from '../../../shared/services/api';

/**
 * Shown once, right after the first social sign-in (Google / GitHub / LinkedIn) of a
 * brand-new account. The password typed here is the *site* password stored in the
 * database (hashed) and is what the email + password form uses afterwards.
 *
 * The page is reachable only with the short-lived, single-purpose token the
 * backend puts in the redirect URL — a session token cannot be used here, and
 * this token cannot be used to reach the dashboard.
 */
export default function SetPassword() {
  const location = useLocation();
  const { t } = useTranslation('auth');
  const params = new URLSearchParams(location.search ?? '');
  const token = params.get('token') ?? '';
  const providerParam = (params.get('provider') ?? '').toLowerCase();
  const provider =
    providerParam === 'github' ? 'GitHub'
    : providerParam === 'linkedin' ? 'LinkedIn'
    : providerParam === 'google' ? 'Google'
    : 'Google';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) { setError(t('setPassword.invalidLink')); return; }
    if (password.length < 6) { setError(t('setPassword.tooShort')); return; }
    if (password !== confirm) { setError(t('setPassword.mismatch')); return; }
    setLoading(true);
    api.auth
      .setPassword({ token, password })
      .then((res) => {
        const sessionToken = (res as { token?: string })?.token;
        const role = String((res as { user?: { role?: string } })?.user?.role || '').toLowerCase();
        setLoading(false);
        setSaved(true);
        if (!sessionToken || !Object.prototype.hasOwnProperty.call(ROLE_HOME, role)) return;
        try {
          localStorage.setItem('lp-auth-token', sessionToken);
        } catch {
          /* storage blocked — the user can still sign in manually */
        }
        // Hard load so AuthProvider re-initializes from /auth/me on boot.
        window.setTimeout(() => window.location.replace(ROLE_HOME[role as UserRole]), 900);
      })
      .catch((err: unknown) => {
        setLoading(false);
        const msg = err instanceof Error ? err.message : '';
        setError(
          /link-expired/i.test(msg) ? t('setPassword.linkExpired')
          : /password-already-set/i.test(msg) ? t('setPassword.alreadySet')
          : /password-too-weak/i.test(msg) ? t('setPassword.tooShort')
          : t('setPassword.invalidLink'),
        );
      });
  };

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-white" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold text-text-primary">LearnPilot</span>
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="rounded-2xl border border-surface-border bg-surface p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-brand" aria-hidden="true" />
            </span>
            <h1 className="text-xl font-bold text-text-primary">{t('setPassword.title')}</h1>
          </div>
          <p className="text-sm text-text-secondary mb-5">{t('setPassword.subtitle', { provider })}</p>

          {saved ? (
            <p role="status" className="text-sm font-semibold text-text-primary">{t('setPassword.saved')}</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Input
                label={t('setPassword.passwordLabel')}
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-pressed={showPw}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary"
                >
                  {showPw
                    ? <EyeOff className="w-4 h-4" aria-hidden="true" />
                    : <Eye className="w-4 h-4" aria-hidden="true" />}
                  {showPw ? t('hidePassword') : t('showPassword')}
                </button>
              </div>
              <Input
                label={t('setPassword.confirmLabel')}
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              <p className="text-xs text-text-secondary">{t('setPassword.skipNote')}</p>
              {error && (
                <p role="alert" className="flex items-start gap-2 text-sm text-text-secondary">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              )}
              <Button type="submit" variant="primary" size="lg" fullWidth isLoading={loading}>
                {loading ? t('setPassword.saving') : t('setPassword.save')}
              </Button>
              <Link to="/account-type" className="block text-center text-sm font-semibold text-brand">
                {t('setPassword.goToLogin')}
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}