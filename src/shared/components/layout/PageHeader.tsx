import type { ReactNode } from 'react';
import { IconBox, type IconTone } from '../ui/IconBox';

/**
 * PageHeader — consistent page heading (tinted icon + title + subtitle + actions)
 * used by every workspace page.
 */
export function PageHeader({ icon, tone = 'brand', title, subtitle, actions }: {
  icon: ReactNode;
  tone?: IconTone;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <IconBox tone={tone} size="lg" className="flex-shrink-0">{icon}</IconBox>
        <div className="min-w-0">
          <h1 className="display-sm text-text-primary truncate">{title}</h1>
          {subtitle && <p className="body text-text-secondary mt-1">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
