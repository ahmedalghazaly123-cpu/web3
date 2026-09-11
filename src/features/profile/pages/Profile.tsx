import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Avatar } from '../../../shared/components/ui/Avatar';
import { Edit, Mail, Calendar, BookOpen, TrendingUp, Award, Flame } from 'lucide-react';

export default function ProfilePage() {
  const { t } = useTranslation('profile');

  const stats = [
    { value: '65%', label: t('courseCompletion'), icon: <BookOpen className="w-5 h-5 text-brand" /> },
    { value: '42h', label: t('hoursLearned'), icon: <TrendingUp className="w-5 h-5 text-success" /> },
    { value: '25', label: t('achievements'), icon: <Award className="w-5 h-5 text-warning" /> },
    { value: '7', label: t('dayStreak'), icon: <Flame className="w-5 h-5 text-accent" /> },
  ];

  const activities = [
    { title: t('activity.derivatives.title'), desc: t('activity.derivatives.desc'), time: t('activity.derivatives.time') },
    { title: t('activity.chainRule.title'), desc: t('activity.chainRule.desc'), time: t('activity.chainRule.time') },
    { title: t('activity.achievement.title'), desc: t('activity.achievement.desc'), time: t('activity.achievement.time') },
  ];

  return (
    <div className="space-y-6 pb-8 page-enter">
      {/* ━━━─ Header ━━━─ */}
      <div className="flex items-center justify-between">
        <h1 className="display-sm text-text-primary">{t('title')}</h1>
        <Link to="/settings">
          <Button variant="outline" size="sm" leftIcon={<Edit className="w-4 h-4" />}>
            {t('editProfile')}
          </Button>
        </Link>
      </div>

      {/* ━━━─ Profile card ━━━─ */}
      <Card variant="elevated" padding="lg" className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <Avatar src="/avatars/student.svg" name="Ahmed Hassan" size="2xl" status="online" />
        <div className="flex-1 text-center sm:text-start">
          <h2 className="h2 text-text-primary">Ahmed Hassan</h2>
          <p className="text-text-secondary mb-1">{t('role')}</p>
          <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 text-sm text-text-tertiary">
            <div className="flex items-center gap-1"><Mail className="w-4 h-4" /> ahmed.hassan@example.com</div>
            <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {t('joined')}</div>
          </div>
        </div>
        <div className="text-center sm:text-end">
          <Badge variant="ai" size="sm">{t('level', { level: 7 })}</Badge>
          <p className="text-xs text-text-tertiary mt-1">{t('xp', { xp: '1,240' })}</p>
        </div>
      </Card>

      {/* ━━━─ Stats ━━━─ */}
      <div>
        <h2 className="h3 text-text-primary mb-4">{t('learningStats')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger">
          {stats.map((stat) => (
            <Card key={stat.label} variant="elevated" padding="md" className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                {stat.icon}
                <span className="text-xl font-bold text-text-primary">{stat.value}</span>
              </div>
              <p className="text-caption text-text-tertiary">{stat.label}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* ━━━─ Recent activity ━━━─ */}
      <div>
        <h2 className="h3 text-text-primary mb-4">{t('recentActivity')}</h2>
        <Card variant="elevated" padding="md">
          <ul className="space-y-3">
            {activities.map((item) => (
              <ActivityItem key={item.title} title={item.title} desc={item.desc} time={item.time} />
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function ActivityItem({ title, desc, time }: { title: string; desc: string; time: string }) {
  return (
    <li className="flex items-center gap-3">
      <div className="w-9 h-9 bg-brand-bg rounded-lg flex items-center justify-center flex-shrink-0">
        <BookOpen className="w-4 h-4 text-brand" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-text-primary">{title}</p>
        <p className="text-sm text-text-secondary">{desc}</p>
      </div>
      <span className="text-caption text-text-tertiary flex-shrink-0">{time}</span>
    </li>
  );
}
