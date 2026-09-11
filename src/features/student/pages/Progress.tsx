import { useTranslation } from 'react-i18next';
import { Card } from '../../../shared/components/ui/Card';
import { ProgressBar } from '../../../shared/components/ui/ProgressBar';
import { courses } from '../../../data';
import {
  Calendar, Trophy,
  
} from 'lucide-react';

export default function ProgressPage() {
  const { t, i18n } = useTranslation('progress');
  const days = t('daysShort', { returnObjects: true }) as string[];
  const currentMonth = new Date().toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });

  const weeklyData = [
    { hours: 2.5, completed: true },
    { hours: 1.0, completed: true },
    { hours: 3.0, completed: true },
    { hours: 0.5, completed: false },
    { hours: 2.0, completed: true },
    { hours: 0.0, completed: false },
    { hours: 0.0, completed: false },
  ];

  const topicMastery = [
    { topic: t('topics.limits'), level: 85 },
    { topic: t('topics.derivatives'), level: 62 },
    { topic: t('topics.integrals'), level: 25 },
    { topic: t('topics.applications'), level: 40 },
  ];

  return (
    <div className="space-y-8 pb-8 page-enter">
      <div className="flex items-center justify-between">
        <h1 className="display-sm text-text-primary">{t('title')}</h1>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Calendar className="w-4 h-4" />
          <span>{currentMonth}</span>
        </div>
      </div>

      {/* ━━━─ Overview stats ━━━─ */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card variant="elevated" padding="md" className="text-center">
          <div className="text-2xl font-bold text-text-primary">65%</div>
          <p className="text-caption text-text-tertiary">{t('overviewStats.completion')}</p>
        </Card>
        <Card variant="elevated" padding="md" className="text-center">
          <div className="text-2xl font-bold text-warning">12</div>
          <p className="text-caption text-text-tertiary">{t('overviewStats.streak')}</p>
        </Card>
        <Card variant="elevated" padding="md" className="text-center">
          <div className="text-2xl font-bold text-brand">42h</div>
          <p className="text-caption text-text-tertiary">{t('overviewStats.hours')}</p>
        </Card>
        <Card variant="elevated" padding="md" className="text-center">
          <div className="text-2xl font-bold text-success">{t('overviewStats.levelValue', { level: 7 })}</div>
          <p className="text-caption text-text-tertiary">{t('overviewStats.level')}</p>
        </Card>
      </div>

      {/* ━━━─ Weekly activity chart ━━━─ */}
      <Card variant="elevated" padding="lg">
        <h2 className="h3 text-text-primary mb-4">{t('weeklyActivity')}</h2>
        <div className="flex items-end justify-between gap-2 h-48">
          {weeklyData.map((day, i) => (
            <div key={i} className="flex flex-col items-center flex-1">
              <div className="w-full max-w-10 flex flex-col items-end gap-1 h-full justify-end">
                <div
                  className="w-full rounded-t-sm transition-all"
                  style={{
                    height: `${(day.hours / 3.0) * 100}%`,
                    backgroundColor: day.completed ? 'var(--color-brand)' : 'var(--color-surface-tertiary)',
                  }}
                />
                <span className="text-caption text-text-tertiary">{days[i]}</span>
              </div>
              <span className="text-caption text-text-tertiary mt-1">{day.hours}h</span>
            </div>
          ))}
        </div>
      </Card>

      {/* ━━━─ Topic mastery ━━━─ */}
      <Card variant="elevated" padding="lg">
        <h2 className="h3 text-text-primary mb-4">{t('topicMastery')}</h2>
        <div className="space-y-4">
          {topicMastery.map((topic) => (
            <div key={topic.topic}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-primary font-medium">{topic.topic}</span>
                <span className="text-text-secondary">{topic.level}%</span>
              </div>
              <ProgressBar value={topic.level} variant={topic.level >= 70 ? 'success' : topic.level >= 40 ? 'warning' : 'error'} size="md" />
            </div>
          ))}
        </div>
      </Card>

      {/* ━━━─ Courses progress ━━━─ */}
      <div>
        <h2 className="h3 text-text-primary mb-4">{t('courseProgress')}</h2>
        <div className="space-y-4">
          {courses.slice(0, 3).map((course) => (
            <Card key={course.id} variant="elevated" padding="md" className="flex items-center gap-4">
              <div className="w-12 h-12 bg-surface-tertiary rounded-lg flex-shrink-0 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-text-primary">{i18n.language === 'ar' ? course.titleAr : course.title}</h3>
                <p className="text-sm text-text-tertiary">{course.instructor}</p>
              </div>
              <div className="text-end min-w-[80px]">
                <p className="text-lg font-bold text-text-primary">{Math.round(course.progress * 100)}%</p>
                <ProgressBar value={course.progress * 100} variant="brand" size="sm" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
