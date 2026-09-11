import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Check, X } from 'lucide-react';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { SectionTabs } from '../../../shared/components/layout/SectionTabs';
import { ownerNav } from '../../../shared/components/layout/navGroups';
import { cn } from '../../../shared/lib/utils';

type Perm = [label: string, owner: boolean, admin: boolean, teacher: boolean, student: boolean];

const SECTIONS: { categoryKey: string; rows: Perm[] }[] = [
  { categoryKey: 'users', rows: [['manageUsers', true, false, false, false]] },
  { categoryKey: 'content', rows: [['manageContent', true, true, true, false]] },
  { categoryKey: 'assessments', rows: [['manageAssessments', true, true, true, false]] },
  { categoryKey: 'analytics', rows: [['viewAnalytics', true, true, false, false]] },
  { categoryKey: 'security', rows: [['auditLogs', true, true, false, false], ['manageSecurity', true, true, false, false]] },
  { categoryKey: 'system', rows: [['manageRoles', true, false, false, false], ['configureSystem', true, false, false, false]] },
];

const LEARNER_ROWS: Perm[] = [
  ['learn', true, true, true, true],
  ['accessAITutor', true, true, true, true],
  ['progressTracking', true, true, false, true],
];

export default function OwnerPermissions() {
  const { t } = useTranslation('owner');
  const { t: tc } = useTranslation('common');

  const Cell = ({ allowed, highlight }: { allowed: boolean; highlight?: boolean }) => (
    <td className={cn('px-4 py-3', highlight && 'bg-warning-bg/30')}>
      <Badge variant={allowed ? 'success' : 'default'} className="inline-flex items-center gap-1">
        {allowed ? <Check className="w-3 h-3" aria-hidden="true" /> : <X className="w-3 h-3" aria-hidden="true" />}
        {allowed ? t('permissions.allowed') : t('permissions.denied')}
      </Badge>
    </td>
  );

  const roleCols: { key: string; label: string }[] = [
    { key: 'owner', label: t('permissions.ownerRole') },
    { key: 'admin', label: t('permissions.adminRole') },
    { key: 'teacher', label: t('permissions.teacherRole') },
    { key: 'student', label: t('permissions.studentRole') },
  ];

  return (
    <div className="space-y-6 pb-8 page-enter">
      <PageHeader icon={<Shield className="w-6 h-6" />} tone="warning" title={t('permissions.title')} subtitle={t('permissions.subtitle')} />
      <SectionTabs items={ownerNav} label={tc('nav.owner')} />

      <Card variant="elevated" padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-surface-secondary border-b border-surface-border">
                <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('permissions.permission')}</th>
                {roleCols.map((r) => (
                  <th key={r.key} scope="col" className={cn('px-4 py-3 text-start text-caption font-semibold uppercase tracking-wide', r.key === 'owner' ? 'text-warning' : 'text-text-tertiary')}>{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SECTIONS.map((section) => (
                <Fragment key={section.categoryKey}>
                  <tr className="bg-surface-secondary/60">
                    <td colSpan={5} className="px-4 py-2 text-caption font-bold text-text-secondary uppercase tracking-wide">
                      {t(`permissions.category.${section.categoryKey}`)}
                    </td>
                  </tr>
                  {section.rows.map(([label, owner, admin, teacher, student]) => (
                    <tr key={label} className="border-b border-surface-border hover:bg-surface-secondary/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-text-primary">{t(`permissions.${label}`)}</td>
                      <Cell allowed={owner} highlight />
                      <Cell allowed={admin} />
                      <Cell allowed={teacher} />
                      <Cell allowed={student} />
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card variant="elevated" padding="none" className="overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-border bg-surface-secondary/60">
          <p className="text-caption font-bold text-text-secondary uppercase tracking-wide">{tc('nav.learn')}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <tbody>
              {LEARNER_ROWS.map(([label, owner, admin, teacher, student]) => (
                <tr key={label} className="border-b border-surface-border last:border-0 hover:bg-surface-secondary/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">{t(`permissions.${label}`)}</td>
                  <Cell allowed={owner} highlight />
                  <Cell allowed={admin} />
                  <Cell allowed={teacher} />
                  <Cell allowed={student} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-caption text-text-tertiary">{t('access.superAdminNote')}</p>
    </div>
  );
}

