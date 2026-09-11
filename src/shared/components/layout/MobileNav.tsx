import { forwardRef, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass, Menu, X, Settings, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useRole } from '../../../app/router';
import { navGroupsByRole, mobileNavByRole, footerNav, type NavItemDef } from './navGroups';
import { RoleBadge } from './RoleToggle';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';

export interface MobileNavProps {
  children?: React.ReactNode;
}

/**
 * Mobile application shell: top bar (drawer toggle, brand, fixed role badge
 * + language switcher), slide-in navigation drawer driven by the same navGroups config
 * as the desktop sidebar, and a bottom tab bar with the role's primary
 * destinations.
 */
export const MobileNav = forwardRef<HTMLDivElement, MobileNavProps>(function MobileNav(
  { children }: MobileNavProps,
  ref,
) {
  const { t } = useTranslation('common');
  const { role } = useRole();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the drawer is open; Escape closes it.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  return (
    <div ref={ref} className="lg:hidden flex flex-col h-screen">
      {/* Mobile top bar */}
      <header className="h-[60px] bg-surface border-b border-surface-border flex items-center justify-between px-3 flex-shrink-0">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ms-2 text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label={t('nav.menu')}
          aria-expanded={drawerOpen}
          aria-controls="mobile-nav-drawer"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-1.5 min-w-0">
          <Compass className="w-4 h-4 text-brand flex-shrink-0" aria-hidden="true" />
          <span className="text-sm font-semibold text-text-primary truncate">{t('appName')}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <RoleBadge />
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="flex-1 overflow-y-auto bg-page">
        {children}
      </main>

      <MobileBottomBar items={mobileNavByRole[role]} />

      {drawerOpen && <NavDrawer onClose={() => setDrawerOpen(false)} />}
    </div>
  );
});

function MobileBottomBar({ items }: { items: NavItemDef[] }) {
  const { t } = useTranslation('common');
  const { pathname } = useLocation();
  return (
    <nav
      className="h-[62px] bg-surface border-t border-surface-border flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)] flex-shrink-0"
      aria-label={t('nav.overview')}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.end ? pathname === item.path : pathname === item.path || pathname.startsWith(item.path + '/');
        return (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.end}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center justify-center flex-1 min-w-0 gap-0.5 rounded-lg transition-all duration-150',
              isActive
                ? item.tone === 'ai' ? 'text-ai' : 'text-brand'
                : 'text-text-tertiary active:text-text-primary active:bg-surface-secondary',
            )}
          >
            <span
              className={cn(
                'flex items-center justify-center w-11 h-7 rounded-full transition-colors',
                isActive && (item.tone === 'ai' ? 'bg-ai-bg' : 'bg-brand-bg'),
              )}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
            </span>
            <span className="text-[10px] font-medium leading-none truncate max-w-full px-0.5">
              {t(item.labelKey)}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}

function NavDrawer({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('common');
  const { role } = useRole();
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t('nav.switchRole')}>
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        id="mobile-nav-drawer"
        className="absolute inset-y-0 start-0 w-72 max-w-[85vw] bg-surface border-e border-surface-border shadow-xl flex flex-col animate-fade-in"
      >
        <div className="h-[60px] flex items-center justify-between px-4 border-b border-surface-border flex-shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Compass className="w-4 h-4 text-brand flex-shrink-0" aria-hidden="true" />
            <span className="text-sm font-semibold text-text-primary truncate">{t('appName')}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -me-2 text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={t('actions.cancel')}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-5" aria-label={t('appName')}>
          {navGroupsByRole[role].map((group) => (
            <DrawerGroup key={group.labelKey} labelKey={group.labelKey} items={group.items} />
          ))}
        </nav>

        <div className="border-t border-surface-border p-3 space-y-0.5 flex-shrink-0">
          {footerNav.map((item) => {
            const Icon = item.id === 'profile' ? User : Settings;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-bg text-brand font-semibold'
                    : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary',
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                {t(item.labelKey)}
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DrawerGroup({ labelKey, items }: { labelKey: string; items: NavItemDef[] }) {
  const { t } = useTranslation('common');
  return (
    <div>
      <p className="px-3 mb-1 text-[11px] font-semibold text-text-tertiary uppercase tracking-widest">
        {t(labelKey)}
      </p>
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.end}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? item.tone === 'ai'
                    ? 'bg-ai-bg text-ai font-semibold'
                    : item.tone === 'warning'
                      ? 'bg-warning-bg text-warning font-semibold'
                      : 'bg-brand-bg text-brand font-semibold'
                  : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary',
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              {t(item.labelKey)}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}