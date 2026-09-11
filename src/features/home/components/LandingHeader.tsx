import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass, Menu, X } from 'lucide-react';
import { Button } from '../../../shared/components/ui/Button';
import { LanguageSwitcher } from '../../../shared/components/ui/LanguageSwitcher';

const NAV_LINKS = [
  { id: 'features', key: 'nav.features' },
  { id: 'how-it-works', key: 'nav.howItWorks' },
  { id: 'courses', key: 'nav.courses' },
] as const;

/**
 * Sticky landing navbar — logo, anchor links, auth CTAs, mobile menu.
 * Anchor scrolling is smooth and offset for the fixed header height.
 */
export function LandingHeader() {
  const { t } = useTranslation('home');
  const [open, setOpen] = useState(false);

  const go = (id: string) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header className="sticky top-0 z-50 bg-surface/85 backdrop-blur-md border-b border-surface-border">
      <nav className="max-w-[1240px] mx-auto px-6 lg:px-8 h-16 flex items-center justify-between" aria-label={t('nav.label')}>
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0" onClick={() => setOpen(false)}>
          <span className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shadow-sm">
            <Compass className="w-5 h-5 text-white" aria-hidden="true" />
          </span>
          <span className="font-bold text-text-primary text-lg tracking-tight">LearnPilot</span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <li key={l.id}>
              <a
                href={`#${l.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  go(l.id);
                }}
                className="text-sm font-medium text-text-secondary hover:text-brand transition-colors"
              >
                {t(l.key)}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-2">
          <LanguageSwitcher />
          <Link to="/account-type">
            <Button variant="outline" size="sm">{t('nav.signIn')}</Button>
          </Link>
          <Link to="/account-type">
            <Button variant="primary" size="sm">{t('nav.register')}</Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-text-secondary hover:bg-surface-secondary transition-colors"
          aria-expanded={open}
          aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-surface-border bg-surface px-6 py-4 space-y-1 animate-fade-in-up">
          {NAV_LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              onClick={(e) => {
                e.preventDefault();
                go(l.id);
              }}
              className="block py-2.5 text-body text-text-secondary hover:text-brand transition-colors"
            >
              {t(l.key)}
            </a>
          ))}
          <div className="flex gap-3 pt-3 pb-1 border-t border-surface-border">
            <Link to="/account-type" className="flex-1">
              <Button variant="outline" fullWidth>{t('nav.signIn')}</Button>
            </Link>
            <Link to="/account-type" className="flex-1">
              <Button variant="primary" fullWidth>{t('nav.register')}</Button>
            </Link>
          </div>
          <div className="flex justify-center pt-2">
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </header>
  );
}
