import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BrainCircuit, GraduationCap, Briefcase, Shield, Crown,
  ChevronDown, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { LanguageSwitcher } from '../../../shared/components/ui/LanguageSwitcher';
import { cn } from '../../../shared/lib/utils';
import type { UserRole } from '../../../app/types';

const ROLE_ROUTES: Record<UserRole, string> = {
  student: '/login/student',
  teacher: '/login/teacher',
  admin: '/login/admin',
  owner: '/login/owner',
};

// Secret keyword typed on the page (no modifiers needed) reveals the
// elevated roles. Change it here if it ever leaks.
const SECRET_WORD = 'admin';

interface RoleCardDef {
  role: UserRole;
  titleKey: string;
  descKey: string;
  ctaKey: string;
  icon: React.ReactNode;
  ring: string;
  iconWrap: string;
  iconColor: string;
}

const PRIMARY: RoleCardDef[] = [
  {
    role: 'student', titleKey: 'accountType.studentTitle', descKey: 'accountType.studentDesc', ctaKey: 'accountType.studentCta',
    icon: <GraduationCap className="w-8 h-8" aria-hidden="true" />,
    ring: 'hover:border-brand/60 hover:shadow-lg hover:shadow-brand/10 focus-visible:ring-brand/40',
    iconWrap: 'bg-brand-bg ring-brand/15', iconColor: 'text-brand',
  },
  {
    role: 'teacher', titleKey: 'accountType.teacherTitle', descKey: 'accountType.teacherDesc', ctaKey: 'accountType.teacherCta',
    icon: <Briefcase className="w-8 h-8" aria-hidden="true" />,
    ring: 'hover:border-ai/60 hover:shadow-lg hover:shadow-ai/10 focus-visible:ring-ai/40',
    iconWrap: 'bg-ai-bg ring-ai/15', iconColor: 'text-ai',
  },
];

const ELEVATED: RoleCardDef[] = [
  {
    role: 'admin', titleKey: 'accountType.adminTitle', descKey: 'accountType.adminDesc', ctaKey: 'accountType.adminCta',
    icon: <Shield className="w-7 h-7" aria-hidden="true" />,
    ring: 'hover:border-accent/60 hover:shadow-lg hover:shadow-accent/10 focus-visible:ring-accent/40',
    iconWrap: 'bg-accent-bg ring-accent/15', iconColor: 'text-accent',
  },
  {
    role: 'owner', titleKey: 'accountType.ownerTitle', descKey: 'accountType.ownerDesc', ctaKey: 'accountType.ownerCta',
    icon: <Crown className="w-7 h-7" aria-hidden="true" />,
    ring: 'hover:border-warning/60 hover:shadow-lg hover:shadow-warning/10 focus-visible:ring-warning/40',
    iconWrap: 'bg-warning-bg ring-warning/15', iconColor: 'text-warning',
  },
];

export default function AccountTypePage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  // Elevated roles (admin / owner) stay completely hidden by default — no
  // expander arrow, no cards. Reveal only via Win+Shift+Q (the Windows/Meta
  // key), or by refreshing the page 5 times in a row (each refresh must be
  // within 15s of the last). One-shot reveal: the next refresh hides again.
  const secretBuffer = useRef('');
  const [expanded, setExpanded] = useState(() => {
    try {
      const now = Date.now();
      const raw = sessionStorage.getItem('lp-elevated');
      const state = raw ? (JSON.parse(raw) as { revealed?: boolean; count?: number; at?: number }) : {};
      // Fifth refresh in a row → one-shot reveal.
      if (state.count === 4 && state.at && now - state.at < 15_000) {
        // Burn the streak so a further refresh hides again and requires 5 more.
        sessionStorage.setItem('lp-elevated', JSON.stringify({ count: 0, at: now }));
        return true;
      }
      // Track refresh streak for the 5-refresh gesture.
      const count = state.at && now - state.at < 15_000 ? (state.count ?? 0) + 1 : 1;
      sessionStorage.setItem('lp-elevated', JSON.stringify({ count, at: now }));
    } catch {
      // storage unavailable — stay hidden
    }
    return false;
  });

  useEffect(() => {
    // Physical-key → letter map: makes the secret word work on ANY keyboard
    // layout (Arabic included), because e.code is layout-independent.
    const codeLetter = (code: string): string | null => {
      const m = /^Key([A-Z])$/.exec(code);
      return m ? m[1].toLowerCase() : null;
    };
    const onKey = (e: KeyboardEvent) => {
      // Win+Shift+Q (Meta on Windows / Cmd on macOS) — no Alt, no Ctrl
      // variants: those are swallowed by the OS (language switch).
      if (e.metaKey && e.shiftKey && (e.code === 'KeyQ' || e.key === 'Q' || e.key === 'q')) {
        e.preventDefault();
        setExpanded(true);
        return;
      }
      // Secret keyword: type "admin" (physical keys, any layout) to reveal.
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const ch = codeLetter(e.code);
        if (ch) {
          secretBuffer.current = (secretBuffer.current + ch).slice(-SECRET_WORD.length);
          if (secretBuffer.current === SECRET_WORD) {
            secretBuffer.current = '';
            setExpanded(true);
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const go = (role: UserRole) => navigate(ROLE_ROUTES[role]);
  return (
    <div className="min-h-screen bg-surface-secondary flex flex-col">
      <div className="flex items-center justify-between px-4 h-16 max-w-6xl w-full mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center">
            <BrainCircuit className="w-5 h-5 text-white" aria-hidden="true" />
          </span>
          <span className="font-bold text-text-primary text-lg">LearnPilot</span>
        </Link>
        <LanguageSwitcher />
      </div>
      <main className="flex-1 flex justify-center px-4 pb-12 pt-4">
        <div className="w-full max-w-4xl">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-sm font-semibold text-brand uppercase tracking-widest mb-2">{t('accountType.eyebrow')}</p>
            <h1 className="text-3xl font-bold text-text-primary">{t('accountType.title')}</h1>
            <p className="body text-text-secondary mt-3">{t('accountType.subtitle')}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-8" role="list">
            {PRIMARY.map((c) => (
              <button key={c.role} type="button" role="listitem" onClick={() => go(c.role)}
                className={cn('group text-start bg-surface border-2 border-surface-border rounded-2xl p-6 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2', c.ring)}>
                <span className={cn('w-16 h-16 rounded-2xl ring-1 ring-inset flex items-center justify-center mb-5 group-hover:scale-105 transition-transform', c.iconWrap, c.iconColor)}>{c.icon}</span>
                <span className="block text-xl font-bold text-text-primary mb-2">{t(c.titleKey)}</span>
                <span className="block body-sm text-text-secondary mb-5 min-h-[3.5rem]">{t(c.descKey)}</span>
                <span className={cn('inline-flex items-center gap-2 text-sm font-semibold', c.iconColor)}>
                  {t(c.ctaKey)}
                  <ArrowRight className="w-4 h-4 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
                </span>
              </button>
            ))}
          </div>
          <div className={cn('mt-4 text-center', !expanded && 'hidden')}>
            <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} aria-controls="elevated-roles"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface rounded-xl min-h-[44px]">
              {t(expanded ? 'accountType.fewerOptions' : 'accountType.moreOptions')}
              <ChevronDown className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
            </button>
            <div id="elevated-roles" className={cn('grid transition-all duration-300', expanded ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0')}>
              <div className="overflow-hidden">
                <div className="grid sm:grid-cols-2 gap-4">
                  {ELEVATED.map((c) => (
                    <button key={c.role} type="button" tabIndex={expanded ? 0 : -1} onClick={() => go(c.role)}
                      className={cn('group text-start bg-surface border border-dashed border-surface-border-strong rounded-2xl p-5 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2', c.ring)}>
                      <span className="flex items-center gap-3 mb-2">
                        <span className={cn('w-12 h-12 rounded-xl ring-1 ring-inset flex items-center justify-center group-hover:scale-105 transition-transform', c.iconWrap, c.iconColor)}>{c.icon}</span>
                        <span className="text-lg font-bold text-text-primary">{t(c.titleKey)}</span>
                      </span>
                      <span className="block body-sm text-text-secondary mb-4">{t(c.descKey)}</span>
                      <span className={cn('inline-flex items-center gap-2 text-sm font-semibold', c.iconColor)}>
                        {t(c.ctaKey)}
                        <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <p className="flex items-start justify-center gap-2 text-center text-caption text-text-tertiary mt-8 max-w-xl mx-auto">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            {t('accountType.hierarchyNote')}
          </p>
        </div>
      </main>
    </div>
  );
}

