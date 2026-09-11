import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, Check, X, Save } from 'lucide-react';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { SectionTabs } from '../../../shared/components/layout/SectionTabs';
import { adminNav } from '../../../shared/components/layout/navGroups';
import { useToast } from '../../../shared/components/ui/ToastProvider';
import { cn } from '../../../shared/lib/utils';

type RoleKey = 'admins' | 'teachers' | 'students';
const ROWS = ['manageUsers', 'manageContent', 'manageAssessments', 'viewAnalytics', 'auditLogs', 'manageSecurity'] as const;
type Row = (typeof ROWS)[number];

const INITIAL: Record<RoleKey, Record<Row, boolean>> = {
  admins: { manageUsers: true, manageContent: true, manageAssessments: true, viewAnalytics: true, auditLogs: true, manageSecurity: false },
  teachers: { manageUsers: false, manageContent: true, manageAssessments: true, viewAnalytics: false, auditLogs: false, manageSecurity: false },
  students: { manageUsers: false, manageContent: false, manageAssessments: false, viewAnalytics: false, auditLogs: false, manageSecurity: false },
};

export default function AdminPermissions() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const toast = useToast();
  const [role, setRole] = useState<RoleKey>('admins');
  const [matrix, setMatrix] = useState(INITIAL);

  const toggle = (row: Row) => {
    setMatrix((m) => ({ ...m, [role]: { ...m[role], [row]: !m[role][row] } }));
  };

  const roleTabs: { key: RoleKey; label: string }[] = [
    { key: 'admins', label: t('userPage.admins') },
    { key: 'teachers', label: t('userPage.teachers') },
    { key: 'students', label: t('userPage.students') },
  ];

  return (
    <div className="space-y-6 pb-8 page-enter">
      <PageHeader
        icon={<KeyRound className="w-6 h-6" />}
        title={t('permissionPage.title')}
        subtitle={t('permissionPage.subtitle')}
        actions={
          <Button
            variant="primary"
            leftIcon={<Save className="w-4 h-4" />}
            onClick={() => toast({ variant: 'success', title: t('permissionPage.updatedToast'), description: `${t(`userPage.${role}`)} — ${t('permissionPage.summary')}` })}
          >
            {t('permissionPage.updateRole')}
          </Button>
        }
      />
      <SectionTabs items={adminNav} label={tc('nav.admin')} />

      <div className="flex items-center gap-2 flex-wrap" role="tablist" aria-label={t('permissionPage.rolesHeading')}>
        {roleTabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={role === key}
            onClick={() => setRole(key)}
            className={cn(
              'px-3.5 py-2 rounded-lg text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
              role === key
                ? 'bg-brand-bg text-brand border-brand-border font-semibold'
                : 'bg-surface text-text-secondary border-surface-border hover:bg-surface-secondary hover:text-text-primary',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Card variant="elevated" padding="none" className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-secondary border-b border-surface-border">
              <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('permissionPage.category')}</th>
              <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('permissionPage.rolesHeading')}</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const allowed = matrix[role][row];
              return (
                <tr key={row} className="border-b border-surface-border last:border-0 hover:bg-surface-secondary/60 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-text-primary">{t(`permissionPage.rows.${row}`)}</td>
                  <td className="px-4 py-3.5">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={allowed}
                      onClick={() => toggle(row)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                        allowed
                          ? 'bg-success-bg text-success border-success-border hover:bg-success/10'
                          : 'bg-surface-tertiary text-text-tertiary border-surface-border hover:bg-surface-secondary',
                      )}
                    >
                      {allowed ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <X className="w-3.5 h-3.5" aria-hidden="true" />}
                      {allowed ? t('permissionPage.allowed') : t('permissionPage.denied')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <p className="text-caption text-text-tertiary">
        {t('permissionPage.summary')} — {t('userPage.admins')} · {t('userPage.teachers')} · {t('userPage.students')}
      </p>
    </div>
  );
}
