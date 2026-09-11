import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileCheck2, Send, TrendingUp, Radio, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { IconBox } from '../../../shared/components/ui/IconBox';
import { Avatar } from '../../../shared/components/ui/Avatar';
import { useToast } from '../../../shared/components/ui/ToastProvider';
import { cn } from '../../../shared/lib/utils';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Recent submissions quick-review list
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
interface Submission {
  student: string;
  assignment: string;
  time: string;
  status: 'pending' | 'late' | 'graded';
  score?: number;
}

const SUBMISSIONS: Submission[] = [
  { student: 'Mariam Hassan', assignment: 'sub1', time: '12m', status: 'pending' },
  { student: 'Karim Fathy', assignment: 'sub1', time: '2h', status: 'pending' },
  { student: 'Laila Mostafa', assignment: 'sub2', time: '1h', status: 'late' },
  { student: 'Youssef Adel', assignment: 'sub2', time: '3h', status: 'graded', score: 88 },
];

const AVATAR_POOL = ['/avatars/student.svg', '/avatars/instructor-4.svg', '/avatars/instructor-2.svg', '/avatars/instructor-5.svg'];

export function SubmissionsFeed() {
  const { t } = useTranslation('teacher');
  const toast = useToast();

  const statusMeta: Record<Submission['status'], { variant: 'warning' | 'error' | 'success'; label: string }> = {
    pending: { variant: 'warning', label: t('submissionsWidget.pending') },
    late: { variant: 'error', label: t('submissionsWidget.late') },
    graded: { variant: 'success', label: t('submissionsWidget.graded') },
  };

  return (
    <Card variant="elevated" padding="lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <IconBox tone="brand" size="md"><FileCheck2 /></IconBox>
          <h2 className="h3 text-text-primary">{t('submissionsWidget.title')}</h2>
        </div>
        <Link
          to="/teacher/assignments"
          className="text-sm font-semibold text-brand hover:text-brand-hover transition-colors inline-flex items-center gap-0.5"
        >
          {t('submissionsWidget.viewAll')}
          <ChevronRight className="w-4 h-4 rtl:-scale-x-100" aria-hidden="true" />
        </Link>
      </div>

      <ul className="divide-y divide-surface-border">
        {SUBMISSIONS.map((sub, i) => (
          <li key={sub.student + sub.time} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <Avatar src={AVATAR_POOL[i % AVATAR_POOL.length]} name={sub.student} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-medium text-text-primary truncate">{sub.student}</p>
              <p className="text-caption text-text-tertiary truncate">
                {t(`submissionsWidget.items.${i}.assignment`)} · {sub.time}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {sub.score !== undefined && (
                <span className="text-caption font-bold text-success">{sub.score}%</span>
              )}
              <Badge variant={statusMeta[sub.status].variant} size="xs">
                {statusMeta[sub.status].label}
              </Badge>
              {sub.status !== 'graded' && (
                <Button
                  variant="primary-ghost"
                  size="xs"
                  onClick={() => toast({
                    variant: 'info',
                    title: t('submissionsWidget.gradedToast'),
                    description: t('submissionsWidget.gradedToastDesc'),
                  })}
                >
                  {t('submissionsWidget.grade')}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Class performance trend — grouped CSS bar chart (6 weeks)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const TREND: Record<string, number[]> = {
  calculus: [72, 74, 79, 77, 81, 84],
  linear: [64, 66, 63, 70, 69, 73],
  physics: [80, 83, 82, 86, 85, 89],
};

export function PerformanceTrend() {
  const { t } = useTranslation('teacher');
  const entries = Object.entries(TREND);
  const weeks = TREND.calculus.length;

  return (
    <Card variant="elevated" padding="lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <IconBox tone="success" size="md"><TrendingUp /></IconBox>
          <h2 className="h3 text-text-primary">{t('trendWidget.title')}</h2>
        </div>
        <span className="text-caption text-text-tertiary">{t('trendWidget.weeks')}</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {entries.map(([key]) => (
          <span key={key} className="inline-flex items-center gap-1.5 text-caption text-text-secondary">
            <span className={cn('w-2.5 h-2.5 rounded-sm', {
              'bg-brand': key === 'calculus',
              'bg-ai': key === 'linear',
              'bg-success': key === 'physics',
            })} aria-hidden="true" />
            {t(`trendWidget.legend.${key}`)}
          </span>
        ))}
      </div>

      {/* Chart */}
      <div className="flex items-end gap-2 h-36" role="img" aria-label={t('trendWidget.title')}>
        {Array.from({ length: weeks }).map((_, w) => (
          <div key={w} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
            <div className="flex items-end gap-0.5 w-full h-full justify-center">
              {entries.map(([key, values]) => (
                <span
                  key={key}
                  title={`${t(`trendWidget.legend.${key}`)}: ${values[w]}%`}
                  className={cn('w-2.5 rounded-t-sm transition-all', {
                    'bg-brand': key === 'calculus',
                    'bg-ai': key === 'linear',
                    'bg-success': key === 'physics',
                  })}
                  style={{ height: `${values[w]}%` }}
                />
              ))}
            </div>
            <span className="text-[9px] text-text-tertiary">W{w + 1}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Broadcast alert system for struggling students
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
interface StrugglingStudent {
  name: string;
  reasonKey: string;
  avatar: string;
}

const STRUGGLING: StrugglingStudent[] = [
  { name: 'Laila Mostafa', reasonKey: 'struggling1', avatar: '/avatars/instructor-2.svg' },
  { name: 'Omar Samir', reasonKey: 'struggling2', avatar: '/avatars/student.svg' },
];

export function BroadcastAlerts() {
  const { t } = useTranslation('teacher');
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<string[]>(STRUGGLING.map((s) => s.name));
  const [lastCount, setLastCount] = useState<number | null>(null);

  const toggle = (name: string) =>
    setSelected((cur) => (cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]));

  const send = () => {
    if (!message.trim() || selected.length === 0) return;
    toast({
      variant: 'success',
      title: t('broadcast.sent'),
      description: t('broadcast.sentDesc', { count: selected.length }),
    });
    setLastCount(selected.length);
    setMessage('');
  };

  return (
    <Card variant="elevated" padding="lg" glow="warning">
      <div className="flex items-center gap-3 mb-2">
        <IconBox tone="warning" size="md"><Radio /></IconBox>
        <h2 className="h3 text-text-primary">{t('broadcast.title')}</h2>
      </div>
      <p className="body-sm text-text-secondary mb-4">{t('broadcast.subtitle')}</p>

      {/* Student chips */}
      <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label={t('broadcast.title')}>
        {STRUGGLING.map((s) => {
          const active = selected.includes(s.name);
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => toggle(s.name)}
              aria-pressed={active}
              className={cn(
                'inline-flex items-center gap-2 ps-1 pe-3 py-1 rounded-full border text-body-sm font-medium transition-colors',
                active
                  ? 'bg-warning-bg border-warning/40 text-warning'
                  : 'bg-surface border-surface-border text-text-tertiary opacity-60'
              )}
            >
              <Avatar src={s.avatar} name={s.name} size="xs" />
              {s.name}
            </button>
          );
        })}
      </div>

      {/* Message composer */}
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={t('broadcast.placeholder')}
          aria-label={t('broadcast.title')}
          className="flex-1 px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors"
        />
        <Button
          variant="warning"
          size="md"
          leftIcon={<Send className="w-4 h-4" />}
          disabled={!message.trim() || selected.length === 0}
          onClick={send}
        >
          {t('broadcast.send')}
        </Button>
      </div>

      {lastCount !== null && (
        <p role="status" className="flex items-center gap-1.5 text-caption text-success mt-3">
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          {t('broadcast.sentTo', { count: lastCount })}
        </p>
      )}
    </Card>
  );
}
