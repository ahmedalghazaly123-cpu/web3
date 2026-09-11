import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Lightbulb } from 'lucide-react';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { ProgressBar } from '../../../shared/components/ui/ProgressBar';
import { IconBox } from '../../../shared/components/ui/IconBox';
import { SectionTabs } from '../../../shared/components/layout/SectionTabs';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { teacherNav } from '../../../shared/components/layout/navGroups';

const weekPoints = [68, 72, 70, 78, 76, 82, 85];
const monthPoints = [62, 66, 70, 68, 74, 78, 80, 82, 84, 81, 86, 88];

function Sparkline({ points }: { points: number[] }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * 100;
    const y = 100 - ((p - min) / range) * 84 - 8;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full" aria-hidden="true">
      <defs>
        <linearGradient id="analytics-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--color-brand-rgb) / 0.25)" />
          <stop offset="100%" stopColor="rgb(var(--color-brand-rgb) / 0)" />
        </linearGradient>
      </defs>
      <polygon points={`0,100 ${coords.join(' ')} 100,100`} fill="url(#analytics-fill)" />
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke="rgb(var(--color-brand-rgb))"
        strokeWidth="2.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function TeacherAnalytics() {
  const { t } = useTranslation('teacher');
  const { t: tc } = useTranslation('common');
  const [range, setRange] = useState<'weekly' | 'monthly'>('weekly');

  const insights = [
    { key: 'aiInsight1', tone: 'success' as const, trend: '+14%' },
    { key: 'aiInsight2', tone: 'error' as const, trend: '-22%' },
    { key: 'aiInsight3', tone: 'success' as const, trend: '+31%' },
  ];

  const byClass = [
    { key: 'classes.calculus', avg: 82, trend: 'up' },
    { key: 'classes.linearAlgebra', avg: 78, trend: 'up' },
    { key: 'classes.physics', avg: 61, trend: 'down' },
  ];

  return (
    <div className="space-y-6 pb-8 page-enter">
      <PageHeader icon={<BarChart3 className="w-6 h-6" />} title={t('analytics.title')} subtitle={t('analytics.subtitle')} />
      <SectionTabs items={teacherNav} label={tc('nav.teacher')} />

      <div className="flex items-center gap-2 justify-end">
        {(['weekly', 'monthly'] as const).map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={range === r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${range === r ? 'bg-brand-bg text-brand border-brand-border font-semibold' : 'bg-surface text-text-secondary border-surface-border hover:bg-surface-secondary'}`}
          >
            {t(`analytics.${r}`)}
          </button>
        ))}
      </div>

      <Card variant="elevated" padding="lg">
        <h2 className="h4 text-text-primary mb-4">{t('analytics.performanceTrend')}</h2>
        <div className="h-48 rounded-xl overflow-hidden bg-surface-secondary/50 p-2">
          <Sparkline points={range === 'weekly' ? weekPoints : monthPoints} />
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card variant="elevated" padding="lg">
          <h2 className="h4 text-text-primary mb-4">{t('analytics.byClass')}</h2>
          <div className="space-y-4">
            {byClass.map((c) => (
              <div key={c.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-body-sm font-medium text-text-primary">{t(c.key)}</span>
                  <span className="text-body-sm font-semibold text-text-primary flex items-center gap-1.5">
                    {c.avg}%
                    {c.trend === 'up'
                      ? <TrendingUp className="w-3.5 h-3.5 text-success" aria-hidden="true" />
                      : <TrendingDown className="w-3.5 h-3.5 text-error" aria-hidden="true" />}
                  </span>
                </div>
                <ProgressBar value={c.avg} size="sm" variant={c.avg >= 80 ? 'success' : c.avg >= 60 ? 'brand' : 'warning'} />
              </div>
            ))}
          </div>
        </Card>

        <Card variant="elevated" padding="lg">
          <h2 className="h4 text-text-primary mb-4">{t('analytics.aiInsights')}</h2>
          <div className="space-y-3">
            {insights.map((i) => (
              <div key={i.key} className="flex items-start gap-3 p-3 rounded-xl bg-surface-secondary/60">
                <IconBox tone={i.tone} size="sm" className="mt-0.5"><Lightbulb /></IconBox>
                <div className="min-w-0">
                  <p className="text-body-sm font-medium text-text-primary">
                    {t(`analytics.${i.key}`)}
                    <Badge variant={i.tone === 'success' ? 'success' : 'error'} size="xs" className="ms-2">{i.trend}</Badge>
                  </p>
                  <p className="text-caption text-text-secondary mt-0.5">{t(`analytics.${i.key}Desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

