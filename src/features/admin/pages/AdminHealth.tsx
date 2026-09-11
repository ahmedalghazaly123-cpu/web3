import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Info, CheckCircle2, Sparkles } from 'lucide-react';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { IconBox } from '../../../shared/components/ui/IconBox';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { SectionTabs } from '../../../shared/components/layout/SectionTabs';
import { adminNav } from '../../../shared/components/layout/navGroups';
import { useToast } from '../../../shared/components/ui/ToastProvider';
import { cn } from '../../../shared/lib/utils';

const SERVICES = [
  { key: 'owner:health.api', latency: 142, degraded: false },
  { key: 'owner:health.database', latency: 38, degraded: false },
  { key: 'owner:health.ai', latency: 240, degraded: true },
  { key: 'owner:health.storage', latency: 88, degraded: false },
];

const INITIAL_FLAGS = [
  { id: 'aiTutor', enabled: true },
  { id: 'planner', enabled: true },
  { id: 'insights', enabled: true },
  { id: 'certificates', enabled: false },
];

export default function AdminHealth() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const toast = useToast();
  const [tab, setTab] = useState<'health' | 'flags'>('health');
  const [flags, setFlags] = useState(INITIAL_FLAGS);

  const toggleFlag = (id: string) => {
    setFlags((f) => f.map((flag) => (flag.id === id ? { ...flag, enabled: !flag.enabled } : flag)));
    toast({ variant: 'success', title: t('healthPage.toggleToast') });
  };

  return (
    <div className="space-y-6 pb-8 page-enter">
      <PageHeader icon={<Activity className="w-6 h-6" />} title={t('healthPage.title')} subtitle={t('healthPage.subtitle')} />
      <SectionTabs items={adminNav} label={tc('nav.admin')} />

      <div className="flex items-center gap-2" role="tablist" aria-label={t('healthPage.title')}>
        {(['health', 'flags'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'px-3.5 py-2 rounded-lg text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
              tab === key
                ? 'bg-brand-bg text-brand border-brand-border font-semibold'
                : 'bg-surface text-text-secondary border-surface-border hover:bg-surface-secondary hover:text-text-primary',
            )}
          >
            {key === 'health' ? t('healthPage.healthTab') : t('healthPage.flagsTab')}
          </button>
        ))}
      </div>

      {tab === 'health' ? (
        <Card variant="elevated" padding="none" className="overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3.5 bg-success-bg/40 border-b border-surface-border">
            <IconBox tone="success" size="sm"><CheckCircle2 className="w-4 h-4" /></IconBox>
            <p className="font-semibold text-text-primary">{t('healthPage.allOperational')}</p>
            <span className="ms-auto text-caption text-text-tertiary">{t('healthPage.latency')}: 142 {t('healthPage.ms')}</span>
          </div>
          <ul>
            {SERVICES.map((s) => (
              <li key={s.key} className="flex items-center gap-3 px-4 py-3.5 border-b border-surface-border last:border-0 hover:bg-surface-secondary/60 transition-colors">
                <IconBox tone={s.degraded ? 'warning' : 'success'} size="sm">
                  {s.degraded ? <Info className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                </IconBox>
                <span className="font-medium text-text-primary">{t(s.key)}</span>
                <Badge variant={s.degraded ? 'warning' : 'success'} dot>
                  {s.degraded ? t('healthPage.degraded') : t('healthPage.operational')}
                </Badge>
                <span className="ms-auto text-body-sm text-text-secondary">{s.latency} {t('healthPage.ms')}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card variant="elevated" padding="none" className="overflow-hidden">
          <ul>
            {flags.map((flag) => (
              <li key={flag.id} className="flex items-center justify-between gap-4 px-4 py-4 border-b border-surface-border last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <IconBox tone={flag.enabled ? 'ai' : 'neutral'} size="sm"><Sparkles className="w-4 h-4" /></IconBox>
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary">{t(`healthPage.flagsList.${flag.id}`)}</p>
                    <p className="text-caption text-text-tertiary truncate">{t(`healthPage.flagsList.${flag.id}Desc`)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={flag.enabled}
                  aria-label={t(`healthPage.flagsList.${flag.id}`)}
                  onClick={() => toggleFlag(flag.id)}
                  className={cn(
                    'relative w-11 h-6 rounded-full flex-shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                    flag.enabled ? 'bg-brand' : 'bg-surface-border-strong',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all',
                      flag.enabled ? 'start-[1.375rem]' : 'start-0.5',
                    )}
                  />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
