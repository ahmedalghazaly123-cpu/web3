import { type HTMLAttributes, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import {
  Search, Bell, Settings, User, ChevronDown, Menu, LogOut, GraduationCap,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { Dropdown } from '../ui/Dropdown';
import { RoleBadge } from './RoleToggle';
import { useAuth } from '@app/layout/AuthProvider';

export interface HeaderProps extends HTMLAttributes<HTMLElement> {
  onMenuClick?: () => void;
  /** Optional heading override; defaults to the translated app name. */
  title?: string;
  rightContent?: React.ReactNode;
}

/**
 * Global top bar: global search, fixed role badge (display-only),
 * language switcher, notifications and the user menu.
 */
export const Header = forwardRef<HTMLElement, HeaderProps>(function Header(
  { className, onMenuClick, title, rightContent, ...props }: HeaderProps,
  ref,
) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { logout } = useAuth();

  const submitSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get('q');
    navigate(q ? `/search?q=${encodeURIComponent(String(q))}` : '/search');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/account-type');
  };

  return (
    <header
      ref={ref}
      className={cn(
        'h-[64px] bg-surface border-b border-surface-border',
        'flex items-center justify-between px-4 lg:px-6 gap-3',
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-3 min-w-0">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden p-2 text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors"
            aria-label={t('nav.menu')}
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
        <div className="hidden sm:flex items-center gap-2 min-w-0">
          <GraduationCap className="w-5 h-5 text-brand flex-shrink-0" aria-hidden="true" />
          <span className="font-semibold text-text-primary truncate">{title ?? t('appName')}</span>
        </div>
        <form onSubmit={submitSearch} role="search" className="hidden md:block relative w-64 lg:w-80">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" aria-hidden="true" />
          <input
            name="q"
            type="search"
            placeholder={t('search.placeholder')}
            aria-label={t('search.placeholder')}
            className="w-full ps-10 pe-4 h-9 text-sm bg-surface-secondary border border-surface-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors"
          />
        </form>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {rightContent}
        <RoleBadge />
        <LanguageSwitcher />
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors relative"
          aria-label={t('nav.notifications')}
        >
          <Bell className="w-5 h-5" aria-hidden="true" />
          <span className="absolute top-1.5 end-1.5 w-2 h-2 bg-error rounded-full" aria-hidden="true" />
        </button>

        <Dropdown
          align="end"
          width="w-56"
          trigger={
            <button
              type="button"
              className="flex items-center gap-2 p-1 text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors"
              aria-label={t('nav.profile')}
            >
              <Avatar src="/avatars/student.svg" name="Ahmed" size="sm" status="online" />
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            </button>
          }
          items={[
            { id: 'profile', label: t('nav.profile'), icon: <User className="w-4 h-4" />, onClick: () => navigate('/profile') },
            { id: 'settings', label: t('nav.settings'), icon: <Settings className="w-4 h-4" />, onClick: () => navigate('/settings') },
            { id: 'logout', label: t('nav.logout'), icon: <LogOut className="w-4 h-4" />, onClick: handleLogout, danger: true, dividerBefore: true },
          ]}
        />
      </div>
    </header>
  );
});
Header.displayName = 'Header';
