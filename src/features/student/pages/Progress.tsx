import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../shared/components/ui/Card';
import { ProgressBar } from '../../../shared/components/ui/ProgressBar';
import { courses } from '../../../data';
import { useAuth } from '../../../app/layout/AuthProvider';
import { learningSync } from '../../../shared/services/learningSync';
import { store } from '../../../shared/services/store';
import type { MasteryRecord } from '../../../shared/domain';
import { Calendar, Trophy } from 'lucide-react';

export default function ProgressPage() {
  const { t, i18n } = useTranslation('progress');
  const { user } = useAuth();
  const studentId = user?.id ?? 'student-local';
  const days = t('daysShort', { returnObjects: true }) as string[];
  const currentMonth = new Date().toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });
  const [events, setEvents] = useState<any[]>([]);
  const [mastery, setMastery] = useState<MasteryRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      if (user?.id) {
        await learningSync.hydrate(user.id);
        const evs = store.events.listByStudent(studentId);
        const mas = store.mastery.listByStudent(studentId);
        setEvents(evs);
        setMastery(mas);
      }
      };
    load();
  }, [studentId, user?.id]);

  const weeklyData = (() => {
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      const dayEvents = events.filter((e) => (e.happenedAt ?? '').slice(0, 10) === dateStr);
      return { hours: dayEvents.length / 2, completed: dayEvents.length > 0 };
    });
    return last7.length ? last7 : [
      { hours: 2.5, completed: true },
      { hours: 1.0, completed: true },
      { hours: 3.0, completed: true },
      { hours: 0.5, completed: false },
      { hours: 2.0, completed: true },
      { hours: 0.0, completed: false },
      { hours: 0.0, completed: false },
    ];
  })();

  const topicMastery = mastery.length
    ? Array.from(
        mastery.reduce((acc, m) => {
          const topic = m.nodeId.replace('concept-', '').replace('skill-', '');
          const cur = acc.get(topic) ?? { topic, level: 0, count: 0 };
          cur.level = Math.round((cur.level * cur.count + (m.mastery ?? 0)) / (cur.count + 1));
          cur.count += 1;
          acc.set(topic, cur);
          return acc;
        }, new Map<string, { topic: string; level: number; count: number }>()),
      ).map(([_, v]) => ({ topic: t(`topics.${v.topic}`, { defaultValue: v.topic }), level: v.level }))
    : [
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
          <div className="text-2xl font-bold text-text-primary">{mastery.length ? Math.round(mastery.reduce((a, m) => a + (m.mastery ?? 0), 0) / mastery.length) : 0}%</div>
          <p className="text-caption text-text-tertiary">{t('overviewStats.completion')}</p>
        </Card>
        <Card variant="elevated" padding="md" className="text-center">
          <div className="text-2xl font-bold text-warning">{store.level.get(studentId)?.streak ?? 12}</div>
          <p className="text-caption text-text-tertiary">{t('overviewStats.streak')}</p>
        </Card>
        <Card variant="elevated" padding="md" className="text-center">
          <div className="text-2xl font-bold text-brand">{events.length}</div>
          <p className="text-caption text-text-tertiary">{t('overviewStats.events')}</p>
        </Card>
        <Card variant="elevated" padding="md" className="text-center">
          <div className="text-2xl font-bold text-success">{t('overviewStats.levelValue', { level: store.level.get(studentId)?.level ?? 7 })}</div>
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
