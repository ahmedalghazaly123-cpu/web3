import { useTranslation } from 'react-i18next';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { IconBox } from '../../../shared/components/ui/IconBox';
import { cn } from '../../../shared/lib/utils';
import { Crown, Shield, Briefcase, GraduationCap, ArrowDown, Users, CheckCircle2, Lock } from 'lucide-react';

export default function OwnerRoles() {
  const { t } = useTranslation('owner');

  const roles = [
    {
      id: 'owner',
      name: t('roles.owner'),
      desc: t('roles.ownerDesc'),
      icon: <Crown className="w-5 h-5" />,
      tone: 'warning' as const,
      users: 1,
      capabilities: ['permissions.manageRoles', 'permissions.configureSystem', 'permissions.manageSecurity', 'permissions.auditLogs', 'permissions.manageUsers'],
    },
    {
      id: 'admin',
      name: t('roles.admin'),
      desc: t('roles.adminDesc'),
      icon: <Shield className="w-5 h-5" />,
      tone: 'accent' as const,
      users: 38,
      capabilities: ['permissions.manageUsers', 'permissions.manageContent', 'permissions.viewAnalytics', 'permissions.auditLogs'],
    },
    {
      id: 'teacher',
      name: t('roles.teacher'),
      desc: t('roles.teacherDesc'),
      icon: <Briefcase className="w-5 h-5" />,
      tone: 'ai' as const,
      users: 1204,
      capabilities: ['permissions.manageContent', 'permissions.manageAssessments', 'permissions.progressTracking'],
    },
    {
      id: 'student',
      name: t('roles.student'),
      desc: t('roles.studentDesc'),
      icon: <GraduationCap className="w-5 h-5" />,
      tone: 'success' as const,
      users: 8215,
      capabilities: ['permissions.learn', 'permissions.accessAITutor', 'permissions.progressTracking'],
    },
  ];

  return (
    <div className="space-y-8 pb-8 page-enter">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-warning-bg flex items-center justify-center ring-1 ring-inset ring-warning/20">
          <Users className="w-6 h-6 text-warning" />
        </div>
        <div>
          <h1 className="display-sm text-text-primary">{t('roles.title')}</h1>
          <p className="body text-text-secondary mt-1">{t('roles.subtitle')}</p>
        </div>
      </div>

      {/* Hierarchy */}
      <Card variant="elevated" padding="lg">
        <h2 className="h3 text-text-primary mb-4">{t('roles.hierarchy')}</h2>
        <div className="flex flex-col items-center gap-2">
          {roles.map((r, i) => (
            <div key={r.id} className="flex flex-col items-center w-full">
              <div className={cn(
                'w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all',
                i === 0 ? 'bg-warning-bg/40 border-warning-border' : 'bg-surface-secondary border-surface-border',
              )}>
                <IconBox tone={r.tone} size="md">{r.icon}</IconBox>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-primary">{r.name}</p>
                  <p className="text-caption text-text-secondary">{r.desc}</p>
                </div>
                <Badge variant="outline" size="sm">{r.users} {t('roles.usersCount')}</Badge>
              </div>
              {i < roles.length - 1 && (
                <span className="my-1.5 text-text-tertiary" aria-hidden="true">
                  <ArrowDown className="w-4 h-4" />
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>
{/* Capabilities by role */}
      <div className="grid lg:grid-cols-2 gap-6">
        {roles.slice(0, 2).map((r) => (
          <Card key={r.id} variant="elevated" padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <IconBox tone={r.tone} size="md">{r.icon}</IconBox>
              <h3 className="h4 text-text-primary">{r.name}</h3>
            </div>
            <p className="text-caption text-text-tertiary mb-1">{t('roles.capabilities')}</p>
            <ul className="space-y-2">
              {r.capabilities.map((cap, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-text-secondary">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  {t(cap)}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {/* Role details / restrictions */}
      <Card variant="elevated" padding="lg">
        <div className="flex items-center gap-3 mb-4">
          <IconBox tone="brand" size="md"><Lock /></IconBox>
          <h2 className="h3 text-text-primary">{t('roles.roleDetails')}</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-warning-bg/30 border border-warning-border">
            <p className="text-sm font-semibold text-warning">{t('access.superAdminNote')}</p>
          </div>
          <div className="p-4 rounded-xl bg-surface-secondary border border-surface-border">
            <p className="text-sm font-semibold text-text-primary">{t('access.adminNote')}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}