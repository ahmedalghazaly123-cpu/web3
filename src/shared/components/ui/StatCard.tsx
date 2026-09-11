import type { ReactNode } from 'react';
import { Card } from './Card';
import { IconBox, type IconTone } from './IconBox';

/**
 * StatCard — shared KPI tile used across dashboards (student, teacher, admin, owner).
 */
export function StatCard({ value, label, icon, tone = 'brand' }: { value: string; label: string; icon: ReactNode; tone?: IconTone }) {
  return (
    <Card variant="elevated" padding="md" className="card-lift">
      <div className="flex items-center gap-3">
        <IconBox tone={tone} size="md">{icon}</IconBox>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-text-primary leading-tight" aria-hidden="true">{value}</p>
          <p className="text-caption text-text-tertiary truncate">{label}</p>
        </div>
      </div>
    </Card>
  );
}
