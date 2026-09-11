import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { ProgressRing } from '../../../shared/components/ui/ProgressRing';
import { ProgressBar } from '../../../shared/components/ui/ProgressBar';
import { Clock, Flame, Plus, ChevronRight } from 'lucide-react';
import { cn, formatDuration } from '../../../shared/lib/utils';
import { useAuth } from '../../../app/layout/AuthProvider';
import { learningSync } from '../../../shared/services/learningSync';
import { store } from '../../../shared/services/store';
import { plannerEngine } from '../../../shared/intelligence/planner';
import type { PlanItem, MasteryRecord } from '../../../shared/domain';

interface PlanSession {
  id: string;
  title: string;
  topic: string;
  duration: number;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  course: string;
  reason?: string;
}

const CONCEPT_LABEL: Record<string, string> = {
  'concept-limits': 'Limits',
  'concept-derivatives': 'Derivatives',
  'concept-continuity': 'Continuity',
};

const daysOfWeek = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function itemToSession(item: PlanItem): PlanSession {
  return {
    id: item.id,
    title: item.title || `${item.kind} – ${item.topic || item.nodeId || 'study'}`,
    topic: item.topic || (item.courseId ? 'Course' : item.kind),
    duration: Math.max(15, item.estimatedMinutes || 30),
    priority: item.priority || 'medium',
    completed: item.status === 'completed',
    course: item.courseId || 'Calculus I',
    reason: item.reason,
  };
}

export default function PlannerPage() {
  const { t } = useTranslation('planner');
  const { user } = useAuth();
  const studentId = user?.id ?? 'student-local';

  const [items, setItems] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (user?.id) await learningSync.hydrate(user.id);
      const existing = store.plans.listByStudent(studentId);
      const nowIso = new Date().toISOString();
      const planned = plannerEngine.planStudy({
        studentId,
        nowIso,
        availableMinutes: 60,
      });
      for (const item of planned.items) {
        const prev = existing.find((e: any) => e.id === item.id);
        if (prev?.status) {
          item.status = prev.status;
          store.plans.save(item);
        }
      }
      setItems(planned.items);
      setLoading(false);
    };
    load();
  }, [studentId]);

  const planItems = useMemo(() => items.map(itemToSession), [items]);
  const completedToday = planItems.filter((s) => s.completed).length;
  const totalToday = planItems.length;
  const todayProgress = totalToday ? (completedToday / totalToday) * 100 : 0;
  const todaySessions = planItems.filter((s) => !s.completed);

  const weakTopics = useMemo(() => {
    const records = store.mastery.listByStudent(studentId).filter((m: MasteryRecord) => (m.mastery ?? 0) < 60);
    const map = new Map<string, { mastery: number; count: number }>();
    for (const m of records) {
      const key = m.nodeId;
      const cur = map.get(key) ?? { mastery: 0, count: 0 };
      cur.mastery = Math.round((cur.mastery * cur.count + (m.mastery ?? 0)) / (cur.count + 1));
      cur.count += 1;
      map.set(key, cur);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].mastery - b[1].mastery);
  }, [studentId]);

  if (loading) {
    return (
      <div className="space-y-8 pb-8 page-enter">
        <p className="body text-text-secondary">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display-sm text-text-primary">{t('whatToStudy')}</h1>
          <p className="body text-text-secondary mt-1">
            {t('headerProgress', { done: completedToday, total: totalToday })}
          </p>
        </div>
        <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
          {t('addSession')}
        </Button>
      </div>

      <div className="flex items-center gap-2 bg-surface border border-surface-border rounded-lg p-1 w-fit">
        <button className="px-4 py-1.5 text-sm font-medium rounded-md bg-brand text-white">{t('today')}</button>
        <button
          className="px-4 py-1.5 text-sm font-medium rounded-md text-text-secondary hover:bg-surface-secondary"
          onClick={() => alert(t('weekViewComingSoon'))}
        >
          {t('week')}
        </button>
      </div>

      <TodayView
        sessions={todaySessions}
        progress={todayProgress}
        completed={completedToday}
        total={totalToday}
        onToggle={(id: string, done: boolean) => {
          const item = items.find((i) => i.id === id);
          if (item) {
            const updated: PlanItem = { ...item, status: done ? 'completed' : 'pending' };
            store.plans.save(updated);
            setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
          }
        }}
      />

      <div>
        <h2 className="h3 text-text-primary mb-4">{t('priorityTopics')}</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {weakTopics.length === 0 ? (
            <p className="body text-text-secondary col-span-3">{t('resultsPage.noWeakTopics')}</p>
          ) : (
            weakTopics.slice(0, 3).map(([nodeId, info]) => (
              <PriorityCard
                key={nodeId}
                topic={CONCEPT_LABEL[nodeId] ?? nodeId}
                mastery={info.mastery}
                lessons={info.count}
                color={info.mastery < 40 ? 'error' : info.mastery < 60 ? 'warning' : 'success'}
              />
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="h3 text-text-primary mb-4">{t('upcomingExams')}</h2>
        <Card variant="elevated" padding="md">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-text-primary">Calculus Midterm</h3>
              <p className="text-sm text-text-secondary">{t('examMeta', { days: 3 })}</p>
            </div>
            <div className="text-end">
              <Badge variant="warning" size="sm">{t('important')}</Badge>
              <p className="text-caption text-text-tertiary mt-1">{t('examDate')}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function TodayView({
  sessions, progress, completed, total, onToggle,
}: {
  sessions: PlanSession[]; progress: number; completed: number; total: number;
  onToggle: (id: string, done: boolean) => void;
}) {
  const { t } = useTranslation('planner');
  return (
    <div className="space-y-4">
      <Card variant="elevated" padding="md" className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ProgressRing value={progress} size={80} strokeWidth={6} color="brand" label={true} />
          <div>
            <h3 className="font-medium text-text-primary">{t('todayCompletion')}</h3>
            <p className="text-sm text-text-secondary">{t('sessionsDone', { done: completed, total })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Flame className="w-4 h-4 text-warning" />
          <span className="font-medium text-text-primary">{t('dayStreak', { days: 5 })}</span>
        </div>
      </Card>
      <div className="space-y-2">
        {sessions.map((session) => (
          <SessionItem key={session.id} session={session} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}

function SessionItem({ session, onToggle }: { session: PlanSession; onToggle: (id: string, done: boolean) => void }) {
  const { t } = useTranslation('planner');
  return (
    <Card variant="elevated" padding="md" className="flex items-center gap-4">
      <input
        type="checkbox"
        className="w-4 h-4 rounded border border-surface-border focus:ring-brand text-brand"
        checked={session.completed}
        onChange={(e) => onToggle(session.id, e.target.checked)}
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{session.title}</h3>
          <Badge variant={session.priority === 'high' ? 'error' : session.priority === 'medium' ? 'warning' : 'default'} size="xs">
            {t(`priority.${session.priority}`)}
          </Badge>
        </div>
        <p className="text-sm text-text-secondary">{session.course} · {session.topic}</p>
        <div className="flex items-center gap-3 text-caption text-text-tertiary mt-1">
          <Clock className="w-3 h-3" />
          <span>{formatDuration(session.duration)}</span>
        </div>
        {session.reason ? <p className="text-xs text-text-tertiary mt-1">{session.reason}</p> : null}
      </div>
      <ChevronRight className="w-4 h-4 text-text-tertiary" />
    </Card>
  );
}

function PriorityCard({ topic, mastery, lessons, color }: {
  topic: string; mastery: number; lessons: number;
  color: 'success' | 'warning' | 'error';
}) {
  const { t } = useTranslation('planner');
  return (
    <Card variant="elevated" padding="md" className="text-center">
      <h3 className="font-medium text-text-primary mb-1">{topic}</h3>
      <p className="text-sm text-text-secondary mb-2">{t('lessonsToReview', { count: lessons })}</p>
      <ProgressBar value={mastery} variant={color} size="sm" />
      <p className="text-xs text-text-tertiary mt-1">{t('mastery', { value: mastery })}</p>
    </Card>
  );
}
