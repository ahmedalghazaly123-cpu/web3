import { useTranslation } from 'react-i18next';
import { Building2, Plus, Users, HardDrive, CreditCard } from 'lucide-react';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { IconBox } from '../../../shared/components/ui/IconBox';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { ProgressBar } from '../../../shared/components/ui/ProgressBar';
import { StatCard } from '../../../shared/components/ui/StatCard';
import { useToast } from '../../../shared/components/ui/ToastProvider';
import { SectionTabs } from '../../../shared/components/layout/SectionTabs';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { adminNav } from '../../../shared/components/layout/navGroups';

const orgs = [
  { id: 1, name: 'Nile STEM Academy', plan: 'enterprise', members: 412, seats: 500, storage: 64, status: 'active' },
  { id: 2, name: 'Cairo Coding School', plan: 'pro', members: 128, seats: 150, storage: 41, status: 'active' },
  { id: 3, name: 'Alexandria Prep', plan: 'trial', members: 24, seats: 30, storage: 12, status: 'expiring' },
];

export default function AdminOrganizations() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const toast = useToast();

  const totalMembers = orgs.reduce((s, o) => s + o.members, 0);

  return (
    <div className="space-y-6 pb-8 page-enter">
      <PageHeader
        icon={<Building2 className="w-6 h-6" />}
        title={t('orgPage.title')}
        subtitle={t('orgPage.subtitle')}
        actions={<Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => toast({ variant: 'info', title: t('orgPage.addOrg') })}>{t('orgPage.addOrg')}</Button>}
      />
      <SectionTabs items={adminNav} label={tc('nav.admin')} />

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard value={String(orgs.length)} label={t('orgPage.title')} icon={<Building2 className="w-5 h-5" />} />
        <StatCard value={totalMembers.toLocaleString()} label={t('orgPage.members')} icon={<Users className="w-5 h-5" />} tone="ai" />
        <StatCard value={String(orgs.filter((o) => o.status === 'active').length)} label={t('orgPage.active')} icon={<CreditCard className="w-5 h-5" />} tone="success" />
      </div>

      {orgs.length === 0 ? (
        <EmptyState icon={<Building2 className="w-6 h-6" />} title={t('orgPage.emptyTitle')} description={t('orgPage.emptyDesc')} />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orgs.map((o) => (
            <Card key={o.id} variant="elevated" padding="lg" className="card-lift">
              <div className="flex items-start justify-between mb-4">
                <IconBox tone="brand" size="lg"><Building2 /></IconBox>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge variant={o.plan === 'enterprise' ? 'primary' : o.plan === 'pro' ? 'ai' : 'warning'}>
                    {t(`orgPage.${o.plan}`)}
                  </Badge>
                  <Badge variant={o.status === 'active' ? 'success' : 'warning'} dot size="xs">
                    {t(`orgPage.${o.status}`)}
                  </Badge>
                </div>
              </div>
              <h3 className="font-semibold text-text-primary">{o.name}</h3>
              <div className="mt-3 space-y-2.5">
                <div className="flex items-center justify-between text-body-sm">
                  <span className="text-text-secondary flex items-center gap-1.5"><Users className="w-4 h-4 text-text-tertiary" aria-hidden="true" />{t('orgPage.members')}</span>
                  <span className="font-medium text-text-primary">{o.members} / {o.seats} {t('orgPage.seats')}</span>
                </div>
                <ProgressBar value={(o.members / o.seats) * 100} size="sm" variant={o.members / o.seats > 0.9 ? 'warning' : 'brand'} />
                <div className="flex items-center justify-between text-body-sm">
                  <span className="text-text-secondary flex items-center gap-1.5"><HardDrive className="w-4 h-4 text-text-tertiary" aria-hidden="true" />{t('orgPage.storageUsed')}</span>
                  <span className="font-medium text-text-primary">{o.storage}%</span>
                </div>
                <ProgressBar value={o.storage} size="sm" variant="ai" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
