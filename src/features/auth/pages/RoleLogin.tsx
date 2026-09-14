import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BrainCircuit, GraduationCap, Briefcase, Shield, Crown,
  ArrowRight, LogIn, UserPlus, Zap, AlertCircle, Eye, EyeOff,
} from 'lucide-react';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { IconBox } from '../../../shared/components/ui/IconBox';
import { LanguageSwitcher } from '../../../shared/components/ui/LanguageSwitcher';
import { useToast } from '../../../shared/components/ui/ToastProvider';
import { cn } from '../../../shared/lib/utils';
import type { UserRole } from '../../../app/types';
import { ROLE_HOME } from '../../../shared/lib/mockAuth';
import { useAuth } from '../../../app/layout/AuthProvider';
import { api } from '../../../shared/services/api';

function GoogleIcon() {
  return (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.9z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.6 2.8v.1C3.5 21.5 7.4 24 12 24z" />
      <path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.6-2.8-.1.1C.5 8.7 0 10.2 0 12s.5 3.3 1.4 4.7l3.8-2.3z" />
      <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.4 0 3.5 2.5 1.4 6.3l3.8 2.9c1-2.8 3.7-4.5 6.8-4.5z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 .5C5.6.5.5 5.6.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.4-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0C16.5 4.9 17.5 5.2 17.5 5.2c.6 1.6.2 2.8.1 3.1.7.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .4.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.6 18.4.5 12 .5z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.05 20.3c-.9.9-1.9 1.6-3 1.5-1.2-.1-2.3-.7-3.1-.7-.8 0-2 .7-3.2.7-1.3 0-2.4-1-3.2-2.4C5.8 16.7 5.5 12.9 6.6 10c.7-1.8 2-3.4 3.8-3.6 1.1-.1 2.1.7 2.9.7.8 0 2-1 3.4-.9 1.5.1 2.8 1 3.6 2.4-2.9 1.6-3.6 4.5-3 6.3.4 1.3 1.4 2.3 2.75 2.4M12.6 6.2c.1-2 1.6-3.8 3.4-4.2-.2 2.1-1.8 4-3.4 4.2" />
    </svg>
  );
}

interface RoleTheme {
  icon: React.ReactNode;
  chip: string;
  iconTone: 'brand' | 'ai' | 'warning' | 'accent';
  gradient: string;
  button: 'primary' | 'ai' | 'warning';
  glow: string;
}

const ROLE_THEME: Record<UserRole, RoleTheme> = {
  student: {
    icon: <GraduationCap className="w-6 h-6" aria-hidden="true" />,
    chip: 'bg-brand-bg text-brand ring-brand/20',
    iconTone: 'brand', gradient: 'from-brand to-brand-hover',
    button: 'primary', glow: 'bg-brand/10',
  },
  teacher: {
    icon: <Briefcase className="w-6 h-6" aria-hidden="true" />,
    chip: 'bg-ai-bg text-ai ring-ai/20',
    iconTone: 'ai', gradient: 'from-ai to-brand',
    button: 'ai', glow: 'bg-ai/10',
  },
  admin: {
    icon: <Shield className="w-6 h-6" aria-hidden="true" />,
    chip: 'bg-accent-bg text-accent ring-accent/20',
    iconTone: 'accent', gradient: 'from-accent to-brand-hover',
    button: 'primary', glow: 'bg-accent/10',
  },
  owner: {
    icon: <Crown className="w-6 h-6" aria-hidden="true" />,
    chip: 'bg-warning-bg text-warning ring-warning/20',
    iconTone: 'warning', gradient: 'from-warning to-brand-hover',
    button: 'warning', glow: 'bg-warning/10',
  },
};

export function RoleLoginBody(p: { role: UserRole }) {
  const { role } = p;
  const { t, i18n } = useTranslation('auth');
  const toast = useToast();
  const navigate = useNavigate();
  const theme = ROLE_THEME[role];
  const roleName = t(`roleLogin.roles.${role}`);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [nameErr, setNameErr] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [formErr, setFormErr] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetErr, setResetErr] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const rtl = i18n.dir() === 'rtl';
  const { login, signup } = useAuth();
  const goHome = () => navigate(ROLE_HOME[role], { replace: true });
  const quickSignIn = () => {
    setFormErr('');
    if (!email || !password) {
      setFormErr(t('authFailed'));
      return;
    }
    setLoading(true);
    window.setTimeout(() => {
      login(role, email, password).then((ok) => {
        setLoading(false);
        if (ok) goHome();
        else setFormErr(t('authFailed'));
      });
    }, 450);
  };
  const social = (provider: 'google' | 'github' | 'apple') => {
    setFormErr('');
    // Google uses the real OAuth flow on the backend; GitHub/Apple remain placeholders.
    if (provider === 'google') {
      window.location.href = `${api.baseURL()}/auth/google`;
      return;
    }
    setSocialLoading(provider);
    window.setTimeout(() => {
      login(role, email, password).then((ok) => {
        setSocialLoading(null);
        setLoading(false);
        if (ok) goHome();
        else setFormErr(t('authFailed'));
      });
    }, 500);
  };
  const switchMode = (m: 'signin' | 'signup') => {
    setMode(m);
    setFormErr(''); setNameErr(''); setEmailErr(''); setPwErr('');
  };

  const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const submitSignin = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr('');
    let ok = true;
    if (!emailOk(email)) { setEmailErr(t('emailInvalid')); ok = false; }
    else setEmailErr('');
    if (password.length < 6) { setPwErr(t('passwordTooShort')); ok = false; }
    else setPwErr('');
    if (!ok) { setFormErr(t('authFailed')); return; }
    setLoading(true);
    window.setTimeout(() => {
      login(role, email, password).then((res) => {
        setLoading(false);
        if (res) goHome();
        else setFormErr(t('authFailed'));
      });
    }, 600);
  };
  const submitSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr('');
    let ok = true;
    if (name.trim().length < 2) { setNameErr(t('roleLogin.nameInvalid')); ok = false; }
    else setNameErr('');
    if (!emailOk(email)) { setEmailErr(t('emailInvalid')); ok = false; }
    else setEmailErr('');
    if (password.length < 6) { setPwErr(t('passwordTooShort')); ok = false; }
    else setPwErr('');
    if (!ok) return;
    setLoading(true);
    window.setTimeout(() => {
      signup(role, name, email, password).then((res) => {
        setLoading(false);
        if (res) goHome();
        else setFormErr(t('roleLogin.emailTaken'));
      });
    }, 700);
  };
  const fillDemo = () => { setEmail(''); setPassword(''); setFormErr(''); };
  const tabCls = (active: boolean) => active
    ? 'bg-surface text-text-primary shadow-sm border border-surface-border'
    : 'text-text-secondary hover:text-text-primary border border-transparent';
  const socialBtn = 'w-full inline-flex items-center justify-center gap-2.5 rounded-xl border border-surface-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-secondary transition-colors disabled:opacity-60 min-h-[44px]';
  return (
    <div className="min-h-screen bg-surface-secondary flex">
      <div className={cn('hidden lg:flex lg:w-1/2 bg-gradient-to-br relative overflow-hidden', theme.gradient)}>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <BrainCircuit className="w-7 h-7 text-white" aria-hidden="true" />
            </div>
            <span className="text-2xl font-bold">LearnPilot</span>
          </div>
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-sm font-semibold">
              {theme.icon}{roleName}
            </span>
            <h2 className="text-4xl font-bold leading-tight">{t('roleLogin.title', { role: roleName })}</h2>
            <p className="text-lg text-white/80 max-w-md">{t('roleLogin.subtitle', { role: roleName })}</p>
          </div>
          <p className="text-sm text-white/60">LearnPilot 2026.</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-4">
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <span className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-white" aria-hidden="true" />
              </span>
              <span className="font-bold text-text-primary">LearnPilot</span>
            </Link>
            <div className="ms-auto"><LanguageSwitcher /></div>
          </div>
          <div className="bg-surface border border-surface-border rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
            <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', theme.gradient)} aria-hidden="true" />
            <div className="flex items-center gap-3 mb-2">
              <IconBox tone={theme.iconTone} size="sm">{theme.icon}</IconBox>
              <span className={cn('text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ring-1 ring-inset', theme.chip)}>{roleName}</span>
            </div>
            <h1 className="h2 text-text-primary">{mode === 'signin' ? t('roleLogin.title', { role: roleName }) : t('roleLogin.signupTitle', { role: roleName })}</h1>
            <p className="body-sm text-text-secondary mt-1 mb-5">{mode === 'signin' ? t('roleLogin.subtitle', { role: roleName }) : t('roleLogin.signupSubtitle', { role: roleName })}</p>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-secondary p-1 mb-5" role="tablist" aria-label={roleName}>
              <button type="button" role="tab" aria-selected={mode === 'signin'} onClick={() => switchMode('signin')} className={cn('inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold min-h-[40px]', tabCls(mode === 'signin'))}>
                <LogIn className="w-4 h-4" aria-hidden="true" />{t('roleLogin.signinTab')}
              </button>
              <button type="button" role="tab" aria-selected={mode === 'signup'} onClick={() => switchMode('signup')} className={cn('inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold min-h-[40px]', tabCls(mode === 'signup'))}>
                <UserPlus className="w-4 h-4" aria-hidden="true" />{t('roleLogin.signupTab')}
              </button>
            </div>
            <div className="rounded-xl border border-dashed border-surface-border-strong p-4 mb-5">
              <p className="flex items-center gap-2 text-sm font-bold text-text-primary mb-1">
                <Zap className="w-4 h-4 text-warning" aria-hidden="true" />{t('roleLogin.demoTitle')}
              </p>
              <p className="text-caption text-text-secondary mb-3">{t('roleLogin.demoSubtitle')}</p>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={theme.button} size="sm" onClick={quickSignIn} isLoading={loading && !socialLoading}>{t('roleLogin.quickSignIn')}</Button>
                <Button type="button" variant="outline" size="sm" onClick={fillDemo}>{t('roleLogin.fillForm')}</Button>
              </div>
            </div>
            {formErr && (
              <p role="alert" className="flex items-start gap-2 text-sm text-error bg-error-bg border border-error/20 rounded-lg px-3 py-2.5 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />{formErr}
              </p>
            )}
            {mode === 'signin' ? (
              <form onSubmit={submitSignin} className="space-y-4" noValidate>
                <Input label={t('emailLabel')} type="email" autoComplete="email"
                  placeholder={t('emailPlaceholder')} required value={email}
                  onChange={(e) => setEmail(e.target.value)} error={emailErr || undefined} />
                <div>
                  <Input label={t('passwordLabel')} type={showPw ? 'text' : 'password'} autoComplete="current-password"
                    placeholder="••••••••" required value={password}
                    onChange={(e) => setPassword(e.target.value)} error={pwErr || undefined} />
                  <div className="flex justify-end mt-1.5">
                    <button type="button" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw}
                      aria-label={showPw ? t('hidePassword') : t('showPassword')}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-text-tertiary hover:text-brand min-h-[32px] px-1">
                      {showPw ? <EyeOff className="w-3.5 h-3.5" aria-hidden="true" /> : <Eye className="w-3.5 h-3.5" aria-hidden="true" />}
                      {showPw ? t('hidePassword') : t('showPassword')}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer min-h-[32px]">
                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                      className="w-4 h-4 rounded border border-surface-border text-brand focus:ring-brand" />
                    <span className="text-sm text-text-secondary">{t('rememberMe')}</span>
                  </label>
                  <button type="button" onClick={() => { setResetOpen(true); setResetEmail(email); setResetErr(''); setResetSent(false); }} className="text-sm text-brand hover:text-brand-hover min-h-[32px] px-1">{t('forgotPassword')}</button>
                </div>
                {resetOpen && (
                  <div className="rounded-xl border border-surface-border bg-surface-secondary p-4 animate-scale-in" role="dialog" aria-modal="false" aria-label={t('resetTitle')}>
                    <p className="text-sm font-semibold text-text-primary">{t('resetTitle')}</p>
                    <p className="text-xs text-text-secondary mt-1 mb-3">{t('resetSubtitle')}</p>
                    {resetSent ? (
                      <p role="status" className="text-sm text-success font-medium">{t('resetSentDesc')}</p>
                    ) : (
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        if (!emailOk(resetEmail)) { setResetErr(t('emailInvalid')); return; }
                        setResetErr('');
                        toast({ variant: 'success', title: t('resetSent'), description: t('resetSentDesc') });
                        setResetSent(true);
                      }} className="space-y-2.5" noValidate>
                        <Input label={t('emailLabel')} type="email" autoComplete="email"
                          placeholder={t('emailPlaceholder')} required value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)} error={resetErr || undefined} />
                        <div className="flex gap-2">
                          <Button type="submit" variant={theme.button} size="sm" className="flex-1">{t('resetSend')}</Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => setResetOpen(false)}>{t('resetCancel')}</Button>
                        </div>
                      </form>
                    )}
                    {resetSent && (
                      <div className="mt-2.5 flex justify-end">
                        <Button type="button" variant="outline" size="sm" onClick={() => setResetOpen(false)}>{t('resetCancel')}</Button>
                      </div>
                    )}
                  </div>
                )}
                <Button type="submit" variant={theme.button} size="lg" fullWidth isLoading={loading && !socialLoading}
                  rightIcon={!loading ? <ArrowRight className={cn('w-4 h-4', rtl && 'rotate-180')} aria-hidden="true" /> : undefined}>
                  {loading && !socialLoading ? t('signingIn') : t('signIn')}
                </Button>
              </form>
            ) : (
              <form onSubmit={submitSignup} className="space-y-4" noValidate>
                <Input label={t('nameLabel')} type="text" autoComplete="name"
                  placeholder={t('namePlaceholder')} required value={name}
                  onChange={(e) => setName(e.target.value)} error={nameErr || undefined} />
                <Input label={t('emailLabel')} type="email" autoComplete="email"
                  placeholder={t('emailPlaceholder')} required value={email}
                  onChange={(e) => setEmail(e.target.value)} error={emailErr || undefined} />
                <Input label={t('passwordLabel')} type={showPw ? 'text' : 'password'} autoComplete="new-password"
                  placeholder="••••••••" required value={password}
                  onChange={(e) => setPassword(e.target.value)} error={pwErr || undefined} />
                <Button type="submit" variant={theme.button} size="lg" fullWidth isLoading={loading && !socialLoading}
                  rightIcon={!loading ? <UserPlus className="w-4 h-4" aria-hidden="true" /> : undefined}>
                  {loading && !socialLoading ? t('roleLogin.creatingAccount') : t('roleLogin.createAccount')}
                </Button>
              </form>
            )}
            <div className="flex items-center gap-3 my-5" aria-hidden="true">
              <span className="flex-1 h-px bg-surface-border" />
              <span className="text-caption text-text-tertiary">{t('orContinue')}</span>
              <span className="flex-1 h-px bg-surface-border" />
            </div>
            <div className="space-y-2.5">
              <button type="button" onClick={() => social('google')} disabled={socialLoading !== null} className={socialBtn}>
                {socialLoading === 'google' ? <span className="w-[18px] h-[18px] rounded-full border-2 border-surface-border border-t-brand animate-spin" /> : <GoogleIcon />}
                {t('google')}
              </button>
              <button type="button" onClick={() => social('github')} disabled={socialLoading !== null} className={socialBtn}>
                {socialLoading === 'github' ? <span className="w-[18px] h-[18px] rounded-full border-2 border-surface-border border-t-brand animate-spin" /> : <GitHubIcon />}
                {t('roleLogin.github')}
              </button>
              <button type="button" onClick={() => social('apple')} disabled={socialLoading !== null} className={socialBtn}>
                {socialLoading === 'apple' ? <span className="w-[18px] h-[18px] rounded-full border-2 border-surface-border border-t-brand animate-spin" /> : <AppleIcon />}
                {t('apple')}
              </button>
            </div>
            <p className="body-sm text-text-secondary text-center mt-5">
              {mode === 'signin' ? t('noAccount') : t('hasAccount')}{' '}
              <button type="button" onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                className="font-semibold text-brand hover:text-brand-hover">
                {mode === 'signin' ? t('roleLogin.signupTab') : t('roleLogin.signinTab')}
              </button>
            </p>
            <div className="border-t border-surface-border mt-5 pt-4 text-center">
              <Link to="/account-type" className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-brand min-h-[44px] px-3">
                <ArrowRight className={cn('w-4 h-4', !rtl && 'rotate-180')} aria-hidden="true" />
                {t('roleLogin.changeType')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RoleLogin(p: { role: UserRole }) {
  return <RoleLoginBody role={p.role} />;
}
