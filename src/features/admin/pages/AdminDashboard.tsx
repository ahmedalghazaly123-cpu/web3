import { cn } from '../../../shared/lib/utils';
import { Link } from 'react-router-dom';
import { LiveActivityFeed, AiCostWidget } from '../components/DashboardExtras';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { ProgressBar } from '../../../shared/components/ui/ProgressBar';
import { IconBox, type IconTone } from '../../../shared/components/ui/IconBox';
import {
  BookOpen, Users, TrendingUp, Award, Plus,
  Heart, AlertCircle, BarChart3, Bell,
} from 'lucide-react';

function StatCard({ value, label, icon, tone = 'brand' }: { value: string; label: string; icon: React.ReactNode; tone?: IconTone }) {
  return (
    <Card variant="elevated" padding="md" className="card-lift">
      <div className="flex items-center gap-3">
        <IconBox tone={tone} size="md">{icon}</IconBox>
        <div>
          <span className="text-2xl font-bold text-text-primary">{value}</span>
          <p className="text-caption text-text-tertiary">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function ActionButton({ title, icon, to }: { title: string; icon: React.ReactNode; to: string }) {
  return (
    <Link to={to} className="block">
      <Button variant="primary" leftIcon={icon} fullWidth>
        {title}
      </Button>
    </Link>
  );
}

function HealthStatus({ status, icon, children }: { status: 'healthy' | 'warning' | 'critical'; icon: React.ReactNode; children: React.ReactNode }) {
  const bg = { healthy: 'bg-success-bg', warning: 'bg-warning-bg', critical: 'bg-error-bg' }[status];
  return (
    <div className={cn('flex items-center gap-2 p-3 rounded-lg', bg)}>
      {icon}
      <span className="text-sm font-medium text-text-primary">{children}</span>
    </div>
  );
}

function ActivityItem({ title, desc, time }: { title: string; desc: string; time: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-surface-tertiary rounded-lg flex items-center justify-center flex-shrink-0">
        <BookOpen className="w-4 h-4 text-text-tertiary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-text-primary truncate">{title}</p>
        <p className="text-sm text-text-secondary truncate">{desc}</p>
      </div>
      <span className="text-caption text-text-tertiary flex-shrink-0">{time}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation('admin');

  const teams = [
    { id: 1, name: t('teams.dataScience'), members: 35, progress: 78, avgScore: 88, iconColor: 'text-brand' },
    { id: 2, name: t('teams.ml'), members: 28, progress: 65, avgScore: 82, iconColor: 'text-ai' },
    { id: 3, name: t('teams.webDev'), members: 42, progress: 72, avgScore: 79, iconColor: 'text-brand' },
    { id: 4, name: t('teams.stats'), members: 19, progress: 55, avgScore: 68, iconColor: 'text-warning' },
  ];

  return (
    <div className="space-y-8 pb-8 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display-sm text-text-primary">{t('dashboard')}</h1>
          <p className="body text-text-secondary mt-1">{t('subtitle')}</p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
          {t('newReport')}
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <StatCard value="3" label={t('adminPanels')} icon={<BookOpen className="w-5 h-5 text-brand" />} />
        <StatCard value="287" label={t('totalReports')} icon={<TrendingUp className="w-5 h-5 text-warning" />} />
        <StatCard value="14" label={t('activeAdmins')} icon={<Users className="w-5 h-5 text-success" />} />
        <StatCard value="92%" label={t('systemUptime')} icon={<Award className="w-5 h-4 text-warning" />} />
      </div>

      <div>
        <h2 className="h3 text-text-primary mb-4">{t('teamsTitle')}</h2>
        <div className="space-y-4">
          {teams.map((team) => (
            <Card key={team.id} variant="elevated" padding="md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-surface-tertiary rounded-xl flex items-center justify-center">
                    <BookOpen className={cn("w-6 h-6", team.iconColor)} />
                  </div>
                  <div>
                    <h3 className="font-medium text-text-primary">{team.name}</h3>
                    <p className="text-sm text-text-tertiary">{team.members} {t('members')}</p>
                  </div>
                </div>
                <div className="text-end min-w-[80px]">
                  <p className="text-lg font-bold text-text-primary">{team.progress}%</p>
                  <ProgressBar value={team.progress} variant="brand" size="sm" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card variant="elevated" padding="lg">
          <h2 className="h3 text-text-primary mb-4">{t('quickActions')}</h2>
          <div className="space-y-3">
            <ActionButton title={t('genWeeklyReport')} icon={<BarChart3 className="w-5 h-5" />} to="/admin/audit-logs" />
            <ActionButton title={t('viewTeamPerf')} icon={<Bell className="w-5 h-5" />} to="/admin/users" />
            <ActionButton title={t('setUpAlerts')} icon={<Bell className="w-5 h-5" />} to="/admin/system-health" />
          </div>
        </Card>

        <Card variant="elevated" padding="lg">
          <h2 className="h3 text-text-primary mb-4">{t('systemHealth')}</h2>
          <div className="space-y-3">
            <HealthStatus status="healthy" icon={<Heart className="w-5 h-5 text-success" />}>{t('systemHealthStatus.healthy')}</HealthStatus>
            <HealthStatus status="warning" icon={<AlertCircle className="w-5 h-5 text-warning" />}>{t('systemHealthStatus.cpu')}</HealthStatus>
            <HealthStatus status="critical" icon={<AlertCircle className="w-5 h-5 text-error" />}>{t('systemHealthStatus.disk')}</HealthStatus>
          </div>
        </Card>

        <Card variant="elevated" padding="lg">
          <h2 className="h3 text-text-primary mb-4">{t('recentActivity')}</h2>
          <div className="space-y-3">
            <ActivityItem title={t('activity.genReport')} desc={t('activity.genReportDesc')} time={t('activity.genReportTime')} />
            <ActivityItem title={t('activity.updatedRoles')} desc={t('activity.updatedRolesDesc')} time={t('activity.updatedRolesTime')} />
            <ActivityItem title={t('activity.deployedML')} desc={t('activity.deployedMLDesc')} time={t('activity.deployedMLTime')} />
          </div>
        </Card>
      </div>

      {/* ━━━─ Live feed + AI cost monitoring ━━━─ */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LiveActivityFeed />
        </div>
        <AiCostWidget />
      </div>
    </div>
  );
}
