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
  BrainCircuit, TrendingUp, Star, Flame, Clock, Calendar, Play,
  CheckCircle, Circle, Sparkles,
} from 'lucide-react';
import { formatDuration, getTimeBasedGreeting } from '../../../shared/lib/utils';
import { AiLessonSummary, QuickQuizWidget, AchievementsCard } from '../components/DashboardExtras';

export default function StudentDashboard() {
  const { t } = useTranslation('dashboard');
  const { t: tCourses } = useTranslation('courses');
  const currentCourse = courses[0];

  const greeting = getTimeBasedGreeting();
  const welcomeKey = `welcome${greeting.charAt(0).toUpperCase()}${greeting.slice(1)}`;

  const stats = [
    { label: t('statToday'), value: '45 min', tone: 'brand' as const, icon: <Clock /> },
    { label: t('statThisWeek'), value: '3.2h', tone: 'success' as const, icon: <TrendingUp /> },
    { label: t('statStreak'), value: '7', tone: 'accent' as const, icon: <Flame /> },
  ];

  const todaysTasks = [
    { id: 1, title: 'Finish Calculus derivatives', completed: false, duration: 25, priority: 'high' as const },
    { id: 2, title: 'Review weak topic: Chain Rule', completed: false, duration: 15, priority: 'medium' as const },
    { id: 3, title: 'Practice linear algebra problems', completed: true, duration: 30, priority: 'low' as const },
  ];

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
          <CourseCover src={currentCourse.image} alt={currentCourse.title} className="aspect-video">
            <Badge className="absolute top-4 start-4" variant="surface">{currentCourse.category}</Badge>
            <div className="absolute bottom-4 end-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-caption font-medium">
              <Play className="w-3 h-3 fill-current ps-px" />
              <span>27 / {currentCourse.totalLessons}</span>
            </div>
          </CourseCover>
          <div className="p-6">
            <h3 className="h3 text-text-primary mb-1">{currentCourse.title}</h3>
            <p className="body-sm text-text-secondary mb-4 line-clamp-2">{currentCourse.description}</p>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">{t('lessonsOf', { current: 27, total: currentCourse.totalLessons, title: 'Derivatives Rules' })}</span>
                <span className="text-brand font-semibold">{Math.round(currentCourse.progress * 100)}%</span>
              </div>
              <ProgressBar value={currentCourse.progress * 100} variant="brand" size="md" />
              <p className="text-caption text-text-tertiary">
                {t('lessonsCompleted', { completed: currentCourse.completedLessons, total: currentCourse.totalLessons })}
              </p>
            </div>
            <Link to={`/courses/${currentCourse.id}`}>
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
        <div>
          <Card variant="elevated" padding="md" className="flex flex-col items-center text-center h-full">
            <ProgressRing value={65} size={100} strokeWidth={8} color="brand" />
                        <h3 className="text-sm font-medium text-text-primary mt-3">{t('overallProgress')}</h3>
            <p className="text-caption text-text-tertiary mt-1">{t('learningPathComplete', { percent: 65 })}</p>
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
            <li className="flex items-center justify-between">
              <span className="body-sm text-text-secondary">Chain Rule</span>
              <Badge variant="error" size="xs">64%</Badge>
            </li>
            <li className="flex items-center justify-between">
              <span className="body-sm text-text-secondary">L'Hopital's Rule</span>
              <Badge variant="warning" size="xs">42%</Badge>
            </li>
            <li className="flex items-center justify-between">
              <span className="body-sm text-text-secondary">Implicit Diff.</span>
              <Badge variant="error" size="xs">58%</Badge>
            </li>
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
                        <ActivityItem icon={<CheckCircle className="w-4 h-4 text-success" />} text={t('activity.completedDerivatives.text')} time={t('activity.completedDerivatives.time')} />
            <ActivityItem icon={<Circle className="w-4 h-4 text-brand" />} text={t('activity.startedChainRule.text')} time={t('activity.startedChainRule.time')} />
            <ActivityItem icon={<Star className="w-4 h-4 text-warning" />} text={t('activity.earnedAchievement.text')} time={t('activity.earnedAchievement.time')} />
          </ul>
        </Card>
      </div>
    </div>
  );
}

function TodaysPlan({ tasks }: { tasks: { id: number; title: string; completed: boolean; duration: number; priority: 'high' | 'medium' | 'low' }[] }) {
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
