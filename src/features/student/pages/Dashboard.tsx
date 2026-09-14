import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { Card } from '../../../shared/components/ui/Card';
import { ProgressBar } from '../../../shared/components/ui/ProgressBar';
import { ProgressRing } from '../../../shared/components/ui/ProgressRing';
import { CourseCover } from '../../../shared/components/ui/CourseCover';
import { IconBox } from '../../../shared/components/ui/IconBox';
import { courses } from '../../../data';
import {
  BrainCircuit, TrendingUp, Flame, Clock, Calendar, Play,
  CheckCircle, Sparkles,
} from 'lucide-react';
import { formatDuration, getTimeBasedGreeting } from '../../../shared/lib/utils';
import { useAuth } from '../../../app/layout/AuthProvider';
import { learningSync } from '../../../shared/services/learningSync';
import { store } from '../../../shared/services/store';
import { AiLessonSummary, QuickQuizWidget, AchievementsCard } from '../components/DashboardExtras';

export default function StudentDashboard() {
  const { t } = useTranslation('dashboard');
  const { t: tCourses } = useTranslation('courses');
  const { user } = useAuth();
  const studentId = user?.id ?? 'student-local';
  const [progress, setProgress] = useState<{ masteryPercent: number; eventCount: number } | null>(null);

  useEffect(() => {
    if (user?.id) {
      void learningSync.hydrate(user.id);
      learningSync.getProgress().then((p: any) => setProgress({ masteryPercent: p?.masteryPercent ?? 0, eventCount: p?.eventCount ?? 0 })).catch(() => setProgress(null));
    }
  }, [user?.id]);

  const greeting = getTimeBasedGreeting();
  const welcomeKey = `welcome${greeting.charAt(0).toUpperCase()}${greeting.slice(1)}`;

  const stats = [
    { label: t('statToday'), value: `${progress?.eventCount ?? 0} events`, tone: 'brand' as const, icon: <Clock /> },
    { label: t('statThisWeek'), value: `${progress?.masteryPercent ?? 0}% avg`, tone: 'success' as const, icon: <TrendingUp /> },
    { label: t('statStreak'), value: `${store.level.get(studentId)?.streak ?? 0}`, tone: 'accent' as const, icon: <Flame /> },
  ];

  const todaysTasks = store.plans.listUpcoming(studentId, new Date().toISOString().slice(0, 10), new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)).map((p) => ({
    id: p.id,
    title: p.title || `${p.kind} – ${p.topic || 'study'}`,
    completed: p.status === 'completed',
    duration: p.estimatedMinutes || 30,
    priority: p.priority || 'medium' as const,
  }));

  return (
    <div className="space-y-8 pb-8 page-enter">
      {/* ━━━─ Welcome + context ━━━─ */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="display-md text-text-primary">
            {t(welcomeKey, { name: 'Ahmed' })}
          </h1>
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center animate-float">
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
        </div>
        <p className="body text-text-secondary max-w-xl">
          {t('contextualMessage')}
        </p>
      </div>

      {/* ━━━─ Stats row ━━━─ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} variant="elevated" padding="md" className="card-lift">
            <div className="flex items-center gap-4">
              <IconBox tone={stat.tone} size="md">{stat.icon}</IconBox>
              <div>
                <div className="text-2xl font-bold text-text-primary">{stat.value}</div>
                <div className="text-caption text-text-secondary">{stat.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ━━━─ Primary: Continue Learning ━━━─ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="h3 text-text-primary">{t('continueLearning')}</h2>
          <Badge variant="primary" size="sm">{t('inProgress')}</Badge>
        </div>
        <Card variant="elevated" padding="none" className="overflow-hidden card-lift">
          <CourseCover src={courses[0]?.image ?? ''} alt={courses[0]?.title ?? ''} className="aspect-video">
            <Badge className="absolute top-4 start-4" variant="surface">{courses[0]?.category ?? ''}</Badge>
            <div className="absolute bottom-4 end-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-caption font-medium">
              <Play className="w-3 h-3 fill-current ps-px" />
              <span>{courses[0]?.completedLessons ?? 0} / {courses[0]?.totalLessons ?? 0}</span>
            </div>
          </CourseCover>
          <div className="p-6">
            <h3 className="h3 text-text-primary mb-1">{courses[0]?.title ?? 'No course in progress'}</h3>
            <p className="body-sm text-text-secondary mb-4 line-clamp-2">{courses[0]?.description ?? ''}</p>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">{t('lessonsOf', { current: courses[0]?.completedLessons ?? 0, total: courses[0]?.totalLessons ?? 0, title: 'Derivatives Rules' })}</span>
                <span className="text-brand font-semibold">{Math.round((courses[0]?.progress ?? 0) * 100)}%</span>
              </div>
              <ProgressBar value={(courses[0]?.progress ?? 0) * 100} variant="brand" size="md" />
              <p className="text-caption text-text-tertiary">
                {t('lessonsCompleted', { completed: courses[0]?.completedLessons ?? 0, total: courses[0]?.totalLessons ?? 0 })}
              </p>
            </div>
            <Link to={`/courses/${courses[0]?.id ?? ''}`}>
              <Button variant="primary" size="md" rightIcon={<Play className="w-4 h-4" />}>
                {tCourses('continue')}
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ━━━─ Secondary: Today's plan ━━━─ */}
        <div className="lg:col-span-2">
          <TodaysPlan tasks={todaysTasks} />
        </div>

        {/* ━━━─ Progress ring ━━━─ */}
        <div className="lg:col-span-1">
          <Card variant="elevated" padding="md" className="text-center">
            <ProgressRing value={progress?.masteryPercent ?? 0} size={100} strokeWidth={8} color="brand" />
            <h3 className="text-sm font-medium text-text-primary mt-3">{t('overallProgress')}</h3>
            <p className="text-caption text-text-tertiary mt-1">{t('learningPathComplete', { percent: progress?.masteryPercent ?? 0 })}</p>
            <Link to="/progress" className="mt-4 text-sm text-brand hover:text-brand-hover">{t('progressSummary')} ↗</Link>
          </Card>
        </div>
      </div>

      {/* ━━━─ Supporting area ━━━─ */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming exam */}
        <Card variant="elevated" padding="md" className="lg:col-span-1">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-5 h-5 text-warning" />
                        <h3 className="font-medium text-text-primary">{t('upcomingExam')}</h3>
          </div>
          <p className="body-sm text-text-secondary mb-2">Calculus Midterm Exam</p>
                    <p className="text-caption text-text-tertiary mb-3">{t('daysLeft', { days: 3, time: '9:00 AM' })}</p>
          <Button variant="warning" size="sm" fullWidth>{t('reviewNow')}</Button>
        </Card>

        {/* Weak topics */}
        <Card variant="elevated" padding="md" className="lg:col-span-1">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="w-5 h-5 text-error" />
            <h3 className="font-medium text-text-primary">{t('weakTopics')}</h3>
          </div>
          <ul className="space-y-2">
            {store.mastery.listByStudent(studentId).filter((m) => (m.mastery ?? 0) < 60).slice(0, 3).map((m) => (
              <li key={m.nodeId} className="flex items-center justify-between">
                <span className="body-sm text-text-secondary">{m.nodeId.replace('concept-', '').replace('skill-', '')}</span>
                <Badge variant={m.mastery < 40 ? 'error' : m.mastery < 60 ? 'warning' : 'default'} size="xs">{m.mastery ?? 0}%</Badge>
              </li>
            ))}
            {store.mastery.listByStudent(studentId).filter((m) => (m.mastery ?? 0) < 60).length === 0 && (
              <li className="text-sm text-text-tertiary">No weak topics yet</li>
            )}
          </ul>
        </Card>

        {/* Recommended lesson */}
        <Card variant="elevated" padding="md" className="lg:col-span-1">
          <div className="flex items-center gap-3 mb-3">
            <BrainCircuit className="w-5 h-5 text-ai" />
                        <h3 className="font-medium text-text-primary">{t('recommendedLesson')}</h3>
          </div>
          <p className="body-sm text-text-secondary mb-2">Integration by Parts Intro</p>
          <p className="text-caption text-text-tertiary mb-3">5 {t('minRead')} · {t('partOf')} Calculus II</p>
          <Link to="/courses/calculus-integration">
                        <Button variant="ai" size="sm" fullWidth>{t('startLesson')}</Button>
          </Link>
        </Card>
      </div>

      {/* ━━━─ AI tools + achievements ━━━─ */}
      <div className="grid lg:grid-cols-3 gap-6">
        <AiLessonSummary />
        <QuickQuizWidget />
        <AchievementsCard />
      </div>

      {/* ━━━─ Recent activity ━━━─ */}
      <div>
        <h2 className="h3 text-text-primary mb-4">{t('recentActivity')}</h2>
        <Card variant="elevated" padding="md">
          <ul className="divide-y divide-surface-border">
            {store.events.listByStudent(studentId).slice(0, 5).map((e, i) => (
              <ActivityItem
                key={e.id ?? i}
                icon={<CheckCircle className="w-4 h-4 text-success" />}
                text={`${e.kind}`}
                time={String((e as { happenedAt?: string }).happenedAt ?? new Date().toISOString())}
              />
            ))}
            {store.events.listByStudent(studentId).length === 0 && (
              <li className="text-sm text-text-tertiary py-3">No recent activity yet.</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function TodaysPlan({ tasks }: { tasks: { id: string; title: string; completed: boolean; duration: number; priority: 'high' | 'medium' | 'low' }[] }) {
  const { t } = useTranslation('dashboard');
  return (
    <div>
      <h2 className="h3 text-text-primary mb-4">{t('todaysPlan')}</h2>
      <Card variant="elevated" padding="md" className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-3 p-3 bg-surface-secondary rounded-lg">
            <input
              type="checkbox"
              defaultChecked={task.completed}
              className="w-4 h-4 rounded border border-surface-border focus:ring-brand text-brand"
            />
            <div className="flex-1">
              <p className="font-medium text-text-primary">{task.title}</p>
              <div className="flex items-center gap-2 text-caption text-text-tertiary mt-0.5">
                <Clock className="w-3 h-3" />
                <span>{formatDuration(task.duration)}</span>
                <Badge variant={task.priority === 'high' ? 'error' : task.priority === 'medium' ? 'warning' : 'default'} size="xs">
                  {t(`priorities.${task.priority}`)}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function ActivityItem({ icon, text, time }: { icon: React.ReactNode; text: string; time: string }) {
  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      {icon}
      <div className="flex-1">
        <p className="body-sm text-text-primary">{text}</p>
        <p className="text-caption text-text-tertiary">{time}</p>
      </div>
    </li>
  );
}
