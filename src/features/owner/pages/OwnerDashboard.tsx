import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { IconBox } from '../../../shared/components/ui/IconBox';
import {
  Crown, Shield, ShieldAlert, Users, GraduationCap, Briefcase,
  TrendingUp, Activity, Server, Database, Zap, HardDrive,
  AlertTriangle, KeyRound, ScrollText, Settings, ChevronRight,
} from 'lucide-react';

export default function OwnerDashboard() {
  const { t } = useTranslation('owner');

  const health = [
    { key: 'api', icon: <Server className="w-4 h-4" />, value: '99.98%', tone: 'success' as const },
    { key: 'database', icon: <Database className="w-4 h-4" />, value: '99.99%', tone: 'success' as const },
    { key: 'ai', icon: <Zap className="w-4 h-4" />, value: '99.95%', tone: 'success' as const },
    { key: 'storage', icon: <HardDrive className="w-4 h-4" />, value: '78%', tone: 'warning' as const },
  ];

  const alerts = [
    { id: 1, tone: 'warning' as const, title: t('alerts.usage'), desc: t('alerts.usageDesc') },
    { id: 2, tone: 'info' as const, title: t('alerts.signups'), desc: t('alerts.signupsDesc') },
    { id: 3, tone: 'error' as const, title: t('alerts.storage'), desc: t('alerts.storageDesc') },
  ];

  const activity = [
    { icon: <KeyRound className="w-4 h-4" />, tone: 'ai' as const, title: t('activity.roleChange'), desc: t('activity.roleChangeTarget'), time: t('time.minsAgo') },
    { icon: <Shield className="w-4 h-4" />, tone: 'success' as const, title: t('activity.security'), desc: t('activity.securityTarget'), time: t('time.hourAgo') },
    { icon: <ScrollText className="w-4 h-4" />, tone: 'warning' as const, title: t('activity.permissionUpdate'), desc: t('activity.permissionUpdateTarget'), time: t('time.hoursAgo') },
  ];

  const platformStats = [
    ['DAU', '3,210'],
    ['MAU', '9,540'],
    ['New this week', '1,842'],
    ['Sessions / day', '48.2K'],
  ];

  const roleDistribution = [
    ['Owner', 1],
    ['Admin', 38],
    ['Teacher', 1204],
    ['Student', 8215],
  ];

  return (
    <div className="space-y-8 pb-8 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-warning-bg flex items-center justify-center ring-1 ring-inset ring-warning/20">
            <Crown className="w-6 h-6 text-warning" />
          </div>
          <div>
            <h1 className="display-sm text-text-primary">{t('dashboard')}</h1>
            <p className="body text-text-secondary mt-1">{t('subtitle')}</p>
          </div>
        </div>
        <Link to="/owner/settings">
          <Button variant="primary" leftIcon={<Settings className="w-4 h-4" />}>{t('actions.platformSettings')}</Button>
        </Link>
      </div>

      {/* Platform stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard value="12,480" label={t('totalUsers')} icon={<Users className="w-5 h-5" />} tone="brand" />
        <StatCard value="8,215" label={t('students')} icon={<GraduationCap className="w-5 h-5" />} tone="ai" />
        <StatCard value="1,204" label={t('teachers')} icon={<Briefcase className="w-5 h-5" />} tone="success" />
        <StatCard value="38" label={t('admins')} icon={<Shield className="w-5 h-5" />} tone="warning" />
      </div>

      {/* System Health */}
      <Card variant="elevated" padding="lg">
        <div className="flex items-center gap-3 mb-5">
          <IconBox tone="success" size="md"><Activity /></IconBox>
          <div>
            <h2 className="h3 text-text-primary">{t('systemHealth')}</h2>
            <p className="text-caption text-text-secondary">{t('health.operational')}</p>
          </div>
          <Badge variant="success" size="sm" className="ms-auto">{t('health.latency')}</Badge>
        </div>
        <div className="grid sm:grid-cols-3 md:grid-cols-4 gap-3">
          {health.map((h) => (
            <div key={h.key} className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-secondary border border-surface-border">
              <IconBox tone={h.tone} size="sm">{h.icon}</IconBox>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary leading-none">{t('health.' + h.key)}</p>
                <p className="text-caption text-text-tertiary">{h.value}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
{/* Critical alerts + admin activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <IconBox tone="error" size="md"><AlertTriangle /></IconBox>
            <h2 className="h3 text-text-primary">{t('criticalAlerts')}</h2>
          </div>
          <div className="space-y-3">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl bg-surface-secondary border border-surface-border">
                <IconBox tone={a.tone} size="sm"><AlertTriangle /></IconBox>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-primary">{a.title}</p>
                  <p className="text-caption text-text-secondary">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <IconBox tone="brand" size="md"><ShieldAlert /></IconBox>
            <h2 className="h3 text-text-primary">{t('recentAdminActivity')}</h2>
          </div>
          <div className="space-y-3">
            {activity.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-surface-secondary border border-surface-border">
                <IconBox tone={a.tone} size="sm">{a.icon}</IconBox>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-primary">{a.title}</p>
                  <p className="text-caption text-text-secondary">{a.desc}</p>
                </div>
                <span className="text-caption text-text-tertiary whitespace-nowrap">{a.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Platform activity / quick actions / distribution */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <IconBox tone="ai" size="md"><TrendingUp /></IconBox>
            <h2 className="h3 text-text-primary">{t('platformActivity')}</h2>
          </div>
          <div className="space-y-2">
            {platformStats.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-secondary/70">
                <span className="text-sm text-text-secondary">{label}</span>
                <span className="text-sm font-bold text-text-primary">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card variant="elevated" padding="lg" glow="ai">
          <div className="flex items-center gap-3 mb-4">
            <IconBox tone="ai" size="md"><Zap /></IconBox>
            <h2 className="h3 text-text-primary">{t('quickActions')}</h2>
          </div>
          <div className="space-y-2">
            <Link to="/owner/access" className="flex items-center justify-between p-3 rounded-xl bg-surface-secondary border border-surface-border hover:border-surface-border-hover transition-colors group">
              <span className="text-sm font-medium text-text-primary">{t('actions.manageAccess')}</span>
              <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-brand" />
            </Link>
            <Link to="/owner/audit" className="flex items-center justify-between p-3 rounded-xl bg-surface-secondary border border-surface-border hover:border-surface-border-hover transition-colors group">
              <span className="text-sm font-medium text-text-primary">{t('actions.reviewAudit')}</span>
              <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-brand" />
            </Link>
            <Link to="/owner/security" className="flex items-center justify-between p-3 rounded-xl bg-surface-secondary border border-surface-border hover:border-surface-border-hover transition-colors group">
              <span className="text-sm font-medium text-text-primary">{t('actions.securityCenter')}</span>
              <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-brand" />
            </Link>
          </div>
        </Card>

        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <IconBox tone="warning" size="md"><Users /></IconBox>
            <h2 className="h3 text-text-primary">{t('permissions.status')}</h2>
          </div>
          <p className="text-sm text-text-secondary mb-3">{t('access.adminNote')}</p>
          <div className="space-y-2">
            {roleDistribution.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{name}</span>
                <span className="font-semibold text-text-primary">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ value, label, icon, tone }: { value: string; label: string; icon: React.ReactNode; tone: 'brand' | 'ai' | 'success' | 'warning' }) {
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