import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { useRole, type UserRole } from '../../../app/router';
import { GraduationCap, Briefcase, Shield, Crown } from 'lucide-react';

const roleMeta: Record<UserRole, { labelKey: string; icon: React.ReactNode; color: string }> = {
  student: { labelKey: 'nav.roles.student', icon: <GraduationCap className="w-4 h-4" aria-hidden="true" />, color: 'text-brand' },
  teacher: { labelKey: 'nav.roles.teacher', icon: <Briefcase className="w-4 h-4" aria-hidden="true" />, color: 'text-ai' },
  admin: { labelKey: 'nav.roles.admin', icon: <Shield className="w-4 h-4" aria-hidden="true" />, color: 'text-accent' },
  owner: { labelKey: 'nav.roles.owner', icon: <Crown className="w-4 h-4" aria-hidden="true" />, color: 'text-warning' },
};

/**
 * Fixed role indicator — display-only badge of the authenticated session role.
 * NOT a selector: no dropdown, no click, no role mutation.
 * (Kept the `RoleToggle` export name so existing Header/MobileNav imports keep working.)
 */
export function RoleBadge() {
  const { role } = useRole();
  const { t } = useTranslation();
  const meta = roleMeta[role];

  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-surface-secondary border border-surface-border text-text-primary select-none"
      aria-label={t('nav.currentRole', { role: t(meta.labelKey) })}
      title={t('nav.currentRole', { role: t(meta.labelKey) })}
    >
      <span className={cn(meta.color)}>{meta.icon}</span>
      <span className={meta.color}>{t(meta.labelKey)}</span>
    </span>
  );
}

/** @deprecated Use `RoleBadge` — same fixed indicator, clearer name. */
export const RoleToggle = RoleBadge;


