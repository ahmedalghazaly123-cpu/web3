import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, TriangleAlert, ShieldCheck } from 'lucide-react';
import { Card } from '../../../shared/components/ui/Card';
import { Badge, type BadgeVariant } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { IconBox } from '../../../shared/components/ui/IconBox';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { SectionTabs } from '../../../shared/components/layout/SectionTabs';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { adminNav } from '../../../shared/components/layout/navGroups';
import { useToast } from '../../../shared/components/ui/ToastProvider';

type Severity = 'critical' | 'warning' | 'resolved';

interface SecurityEvent {
  id: string; event: string; severity: Severity; detail: string; time: string;
}

const initialEvents: SecurityEvent[] = [
  { id: 's1', event: 'Suspicious login pattern', severity: 'critical', detail: '12 failed logins from unknown IP range', time: '18 min ago' },
  { id: 's2', event: 'Unusual API rate spike', severity: 'warning', detail: '3× normal request volume from one tenant', time: '2 hours ago' },
  { id: 's3', event: 'New admin device registered', severity: 'warning', detail: 'Unrecognized device for Karim Fouad', time: '5 hours ago' },
  { id: 's4', event: 'Password policy violation', severity: 'resolved', detail: 'Weak password flagged and rotated', time: 'yesterday' },
  { id: 's5', event: 'Brute-force attempt blocked', severity: 'resolved', detail: 'Rate limiter blocked the source', time: 'yesterday' },
];

const severityBadge: Record<Severity, BadgeVariant> = { critical: 'error', warning: 'warning', resolved: 'success' };

export default function AdminSecurity() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const toast = useToast();
  const [events, setEvents] = useState(initialEvents);
  const [filter, setFilter] = useState<'all' | Severity>('all');

  const visible = events.filter((e) => filter === 'all' || e.severity === filter);

  const resolve = (id: string) => {
    setEvents((cur) => cur.map((e) => (e.id === id ? { ...e, severity: 'resolved' } : e)));
    toast({ variant: 'success', title: t('securityPage.resolvedToast') });
  };

  return (
    <div className="space-y-6 pb-8 page-enter">
      <PageHeader icon={<ShieldAlert className="w-6 h-6" />} tone="error" title={t('securityPage.title')} subtitle={t('securityPage.subtitle')} />
      <SectionTabs items={adminNav} label={tc('nav.admin')} />

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('securityPage.severity')}>
        {(['all', 'critical', 'warning', 'resolved'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${filter === f ? 'bg-error-bg text-error border-error-border font-semibold' : 'bg-surface text-text-secondary border-surface-border hover:bg-surface-secondary'}`}
          >
            {f === 'all' ? tc('nav.overview') : t(`securityPage.${f}`)}
            <span className="ms-1.5 text-caption opacity-70">
              {f === 'all' ? events.length : events.filter((e) => e.severity === f).length}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="w-6 h-6" />}
          tone="success"
          title={t('securityPage.emptyTitle')}
          description={t('securityPage.emptyDesc')}
        />
      ) : (
        <div className="space-y-3">
          {visible.map((e) => (
            <Card key={e.id} variant="elevated" padding="md" className="card-lift">
              <div className="flex flex-wrap items-center gap-3">
                <IconBox tone={e.severity === 'critical' ? 'error' : e.severity === 'warning' ? 'warning' : 'success'} size="md">
                  {e.severity === 'critical' ? <ShieldAlert className="w-5 h-5" /> : e.severity === 'warning' ? <TriangleAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                </IconBox>
                <div className="flex-1 min-w-[180px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-text-primary">{e.event}</h3>
                    <Badge variant={severityBadge[e.severity]} size="xs" dot>{t(`securityPage.${e.severity}`)}</Badge>
                  </div>
                  <p className="text-body-sm text-text-secondary mt-0.5">{e.detail} · {e.time}</p>
                </div>
                {e.severity !== 'resolved' && (
                  <Button variant="ghost" size="sm" onClick={() => resolve(e.id)}>{t('securityPage.markResolved')}</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}