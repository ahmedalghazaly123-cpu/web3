import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BrainCircuit, Zap, Users, Coins, Timer, CreditCard } from 'lucide-react';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { ProgressBar } from '../../../shared/components/ui/ProgressBar';
import { StatCard } from '../../../shared/components/ui/StatCard';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { SectionTabs } from '../../../shared/components/layout/SectionTabs';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { adminNav } from '../../../shared/components/layout/navGroups';

const trendData = [42, 55, 48, 63, 71, 66, 78, 84, 79, 92, 88, 96];

const byRole = [
  { key: 'studentPage', pct: 62 },
  { key: 'teacherPage', pct: 27 },
  { key: 'adminPage', pct: 11 },
];

const byFeature = [
  { key: 'tutor', pct: 55 },
  { key: 'quiz', pct: 25 },
  { key: 'insights', pct: 20 },
];

export default function AdminAI({ initialTab = 'usage' }: { initialTab?: 'usage' | 'costs' }) {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [tab, setTab] = useState<'usage' | 'costs'>(initialTab);

  const max = Math.max(...trendData);
  const min = Math.min(...trendData);
  const coords = trendData.map((p, i) => `${((i / (trendData.length - 1)) * 100).toFixed(1)},${(100 - ((p - min) / (max - min)) * 84 - 8).toFixed(1)}`);

  return (
    <div className="space-y-6 pb-8 page-enter">
      <PageHeader icon={<BrainCircuit className="w-6 h-6" />} tone="ai" title={t('aiPage.title')} subtitle={t('aiPage.subtitle')} />
      <SectionTabs items={adminNav} label={tc('nav.admin')} />

      <div className="flex gap-1.5" role="tablist" aria-label={t('aiPage.title')}>
        {(['usage', 'costs'] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${tab === k ? 'bg-ai-bg text-ai border-ai-border font-semibold' : 'bg-surface text-text-secondary border-surface-border hover:bg-surface-secondary'}`}
          >
            {t(`aiPage.${k}Tab`)}
          </button>
        ))}
      </div>

      {tab === 'usage' ? (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard value="48.2K" label={t('aiPage.totalRequests')} icon={<Zap className="w-5 h-5" />} tone="ai" />
            <StatCard value="1,284" label={t('aiPage.activeUsers')} icon={<Users className="w-5 h-5" />} />
            <StatCard value="12.6M" label={t('aiPage.tokens')} icon={<Coins className="w-5 h-5" />} tone="warning" />
            <StatCard value={`380 ${t('aiPage.ms')}`} label={t('aiPage.avgLatency')} icon={<Timer className="w-5 h-5" />} tone="success" />
          </div>

          <Card variant="elevated" padding="lg">
            <h2 className="h4 text-text-primary mb-4">{t('aiPage.trend')}</h2>
            <div className="h-44 rounded-xl overflow-hidden bg-surface-secondary/50 p-2">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full" aria-hidden="true">
                <defs>
                  <linearGradient id="ai-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(var(--color-ai-rgb) / 0.28)" />
                    <stop offset="100%" stopColor="rgb(var(--color-ai-rgb) / 0)" />
                  </linearGradient>
                </defs>
                <polygon points={`0,100 ${coords.join(' ')} 100,100`} fill="url(#ai-fill)" />
                <polyline points={coords.join(' ')} fill="none" stroke="rgb(var(--color-ai-rgb))" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card variant="elevated" padding="lg">
              <h2 className="h4 text-text-primary mb-4">{t('aiPage.byRole')}</h2>
              <div className="space-y-4">
                {byRole.map((r) => (
                  <div key={r.key}>
                    <div className="flex justify-between mb-1.5 text-body-sm">
                      <span className="text-text-secondary">{t(r.key)}</span>
                      <span className="font-semibold text-text-primary">{r.pct}%</span>
                    </div>
                    <ProgressBar value={r.pct} size="sm" variant="brand" />
                  </div>
                ))}
              </div>
            </Card>
            <Card variant="elevated" padding="lg">
              <h2 className="h4 text-text-primary mb-4">{t('aiPage.byFeature')}</h2>
              <div className="space-y-4">
                {byFeature.map((r) => (
                  <div key={r.key}>
                    <div className="flex justify-between mb-1.5 text-body-sm">
                      <span className="text-text-secondary">{t(`aiFeature.${r.key}`)}</span>
                      <span className="font-semibold text-text-primary">{r.pct}%</span>
                    </div>
                    <ProgressBar value={r.pct} size="sm" variant="ai" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            <StatCard value="$1,842" label={t('aiPage.monthCost')} icon={<CreditCard className="w-5 h-5" />} tone="warning" />
            <StatCard value="$0.146" label={t('aiPage.perToken')} icon={<Coins className="w-5 h-5" />} tone="ai" />
            <StatCard value="$2,500" label={t('aiPage.budget')} icon={<Zap className="w-5 h-5" />} tone="success" />
          </div>
          <Card variant="elevated" padding="lg">
            <h2 className="h4 text-text-primary mb-4">{t('aiPage.costSummary')}</h2>
            <div className="flex items-center justify-between text-body-sm mb-1.5">
              <span className="text-text-secondary">{t('aiPage.consumed')}</span>
              <span className="font-semibold text-text-primary">{t('aiPage.remaining')}: $658</span>
            </div>
            <ProgressBar value={(1842 / 2500) * 100} size="md" variant={1842 / 2500 > 0.8 ? 'warning' : 'brand'} />
            <p className="text-caption text-text-tertiary mt-2">73% · $1,842 / $2,500</p>
          </Card>
        </>
      )}
      <EmptyState icon={<BrainCircuit className="w-6 h-6" />} className="hidden" title={t('aiPage.emptyTitle')} description={t('aiPage.emptyDesc')} compact />
      <Badge variant="ai" className="hidden">{t('aiPage.title')}</Badge>
    </div>
  );
}
