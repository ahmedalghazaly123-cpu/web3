import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, Zap, ChevronRight, Coins } from 'lucide-react';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { IconBox } from '../../../shared/components/ui/IconBox';
import { ProgressBar } from '../../../shared/components/ui/ProgressBar';
import { useToast } from '../../../shared/components/ui/ToastProvider';
import { cn } from '../../../shared/lib/utils';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Live activity feed — audit-log stream with LIVE pulse
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
type FeedTone = 'brand' | 'ai' | 'success' | 'warning' | 'error';

interface FeedEvent {
  actorKey: string;
  actionKey: string;
  timeKey: string;
  tone: FeedTone;
  icon: React.ReactNode;
}

const FEED_ICONS: FeedEvent[] = [
  { actorKey: 'a0', actionKey: 'a0', timeKey: 't0', tone: 'brand', icon: <Activity /> },
  { actorKey: 'a1', actionKey: 'a1', timeKey: 't1', tone: 'ai', icon: <Zap /> },
  { actorKey: 'a2', actionKey: 'a2', timeKey: 't2', tone: 'warning', icon: <Activity /> },
  { actorKey: 'a3', actionKey: 'a3', timeKey: 't3', tone: 'success', icon: <Activity /> },
  { actorKey: 'a4', actionKey: 'a4', timeKey: 't4', tone: 'error', icon: <Activity /> },
];

export function LiveActivityFeed() {
  const { t } = useTranslation('admin');
  const [, force] = useState(0);

  // Subtle "live" re-render pulse every 8s (rotates newest item emphasis)
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 8000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <Card variant="elevated" padding="lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <IconBox tone="ai" size="md"><Activity /></IconBox>
          <h2 className="h3 text-text-primary">{t('liveFeed.title')}</h2>
        </div>
        <span className="inline-flex items-center gap-1.5" aria-label={t('liveFeed.live')}>
          <span className="relative flex w-2.5 h-2.5">
            <span className="absolute inline-flex w-full h-full rounded-full bg-success opacity-60 animate-ping" aria-hidden="true" />
            <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-success" aria-hidden="true" />
          </span>
          <span className="text-caption font-bold text-success tracking-widest">{t('liveFeed.live')}</span>
        </span>
      </div>

      <ul className="divide-y divide-surface-border">
        {FEED_ICONS.map((event, i) => (
          <li
            key={`${event.actorKey}-${i}`}
            className={cn(
              'flex items-center gap-3 py-3 first:pt-0 last:pb-0 transition-opacity duration-700',
              i === 0 && 'animate-fade-in-up'
            )}
          >
            <IconBox tone={event.tone} size="sm">{event.icon}</IconBox>
            <div className="flex-1 min-w-0">
              <p className="text-body-sm text-text-primary truncate">
                <span className="font-semibold">{t(`liveFeed.items.${event.actorKey}.actor`)}</span>{' '}
                {t(`liveFeed.items.${event.actorKey}.action`)}
              </p>
            </div>
            <span className="text-caption text-text-tertiary flex-shrink-0">
              {t(`liveFeed.items.${event.actorKey}.time`)}
            </span>
          </li>
        ))}
      </ul>

      <Link to="/admin/audit-logs" className="mt-4 block">
        <Button variant="outline" size="sm" fullWidth rightIcon={<ChevronRight className="w-4 h-4 rtl:-scale-x-100" />}>
          {t('liveFeed.viewAll')}
        </Button>
      </Link>
    </Card>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   AI token usage & cost monitoring widget
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const DAILY_COST = [42, 55, 48, 61, 70, 58, 64]; // relative bars
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function AiCostWidget() {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const budgetPct = 74;
  const max = Math.max(...DAILY_COST);

  return (
    <Card variant="elevated" padding="lg" glow="ai" className="flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <IconBox tone="ai" size="md"><Coins /></IconBox>
        <h2 className="h3 text-text-primary">{t('aiWidget.title')}</h2>
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl bg-surface-secondary border border-surface-border p-3">
          <p className="text-lg font-bold text-text-primary">12.6M</p>
          <p className="text-caption text-text-tertiary">{t('aiWidget.tokens')}</p>
        </div>
        <div className="rounded-xl bg-surface-secondary border border-surface-border p-3">
          <p className="text-lg font-bold text-text-primary">$1,842</p>
          <p className="text-caption text-text-tertiary">{t('aiWidget.cost')}</p>
        </div>
      </div>

      {/* Budget bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-caption mb-1.5">
          <span className="text-text-secondary">{t('aiWidget.ofBudget')}</span>
          <span className="font-semibold text-warning">{budgetPct}%</span>
        </div>
        <ProgressBar value={budgetPct} variant="warning" size="sm" striped />
      </div>

      {/* Mini cost sparkline */}
      <div className="flex items-end gap-1.5 h-16 mb-4" role="img" aria-label={t('aiWidget.cost')}>
        {DAILY_COST.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <span
              className={cn('w-full rounded-t-sm transition-all', v === max ? 'bg-ai' : 'bg-ai/45')}
              style={{ height: `${(v / max) * 100}%` }}
            />
            <span className="text-[9px] text-text-tertiary">{DAYS[i]}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto">
        <Link to="/admin/ai-usage" className="block">
          <Button
            variant="ai"
            size="sm"
            fullWidth
            leftIcon={<Zap className="w-4 h-4" />}
            onClick={() => toast({ variant: 'info', title: t('aiWidget.viewDetails') })}
          >
            {t('aiWidget.viewDetails')}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
