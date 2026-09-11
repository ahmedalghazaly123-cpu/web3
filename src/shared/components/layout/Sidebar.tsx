import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { useRole } from '../../../app/router';
import { navGroupsByRole, footerNav } from './navGroups';
import { GraduationCap } from 'lucide-react';

const toneClasses = {
  brand: 'bg-brand-bg text-brand',
  ai: 'bg-ai-bg text-ai',
  warning: 'bg-warning-bg text-warning',
} as const;

const itemBase = cn(
  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
);
const itemActive = 'font-semibold';
const itemIdle = 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary';

/**
 * Desktop sidebar - grouped, role-aware navigation driven by navGroups.tsx
 * (single source of truth shared with the mobile drawer and section tabs).
 * Supports every role including owner; all labels are translated.
 */
export function Sidebar() {
  const { role } = useRole();
  const { t } = useTranslation('common');
  const groups = navGroupsByRole[role];

  return (
    <aside
      className="hidden lg:flex flex-col w-64 flex-shrink-0 h-screen sticky top-0 bg-surface border-e border-surface-border"
      aria-label={t('appName')}
    >
      <div className="flex items-center gap-3 px-5 h-16 border-b border-surface-border flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-brand-bg ring-1 ring-inset ring-brand/15 flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-brand" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <span className="block font-bold text-text-primary tracking-tight leading-tight">{t('appName')}</span>
          <span className="block text-[10px] font-medium text-text-tertiary uppercase tracking-widest leading-tight truncate">
            {t('appTagline')}
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5" aria-label={t('appName')}>
        {groups.map((group) => (
          <div key={group.labelKey}>
            <p className="px-3 mb-1.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-widest">
              {t(group.labelKey)}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) => cn(
                      itemBase,
                      isActive ? cn(itemActive, toneClasses[item.tone ?? 'brand']) : itemIdle,
                    )}
                  >
                    <Icon className="w-[18px] h-[18px] flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-surface-border p-3 space-y-0.5 flex-shrink-0">
        {footerNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) => cn(itemBase, isActive ? cn(itemActive, 'bg-brand-bg text-brand') : itemIdle)}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" aria-hidden="true" />
              {t(item.labelKey)}
            </NavLink>
          );
        })}
      </div>
    </aside>
  );
}
