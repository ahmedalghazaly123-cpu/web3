import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import type { NavItemDef, NavTone } from './navGroups';

const activeTone: Record<NavTone, string> = {
  brand: 'bg-brand-bg text-brand border-brand-border font-semibold',
  ai: 'bg-ai-bg text-ai border-ai-border font-semibold',
  warning: 'bg-warning-bg text-warning border-warning-border font-semibold',
};

/**
 * SectionTabs — URL-synced horizontal tab strip used inside Teacher / Admin / Owner shells.
 * Keeps in-page information architecture aligned with the sidebar and the address bar.
 */
export function SectionTabs({ items, label, tone = 'brand' }: { items: NavItemDef[]; label: string; tone?: NavTone }) {
  const { t } = useTranslation('common');
  return (
    <nav
      aria-label={label}
      className="mb-6 -mx-1 px-1 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.end}
            className={({ isActive }) => cn(
              'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap border transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
              isActive
                ? activeTone[item.tone ?? tone]
                : 'bg-surface text-text-secondary border-surface-border hover:bg-surface-secondary hover:text-text-primary',
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {t(item.labelKey)}
          </NavLink>
        );
      })}
    </nav>
  );
}

/** Returns the translated label of the nav item matching the current URL (longest prefix wins). */
export function useActiveNavItem(items: NavItemDef[]): string | undefined {
  const { pathname } = useLocation();
  const { t } = useTranslation('common');
  const active = [...items]
    .sort((a, b) => b.path.length - a.path.length)
    .find((i) => pathname === i.path || pathname.startsWith(i.path + '/'));
  return active ? t(active.labelKey) : undefined;
}
