import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollText, Download, ShieldCheck, KeyRound, UserMinus, Settings, LogIn, Search } from 'lucide-react';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { Badge, type BadgeVariant } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { SectionTabs } from '../../../shared/components/layout/SectionTabs';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { adminNav } from '../../../shared/components/layout/navGroups';
import { useToast } from '../../../shared/components/ui/ToastProvider';

type AuditAction = 'roleChange' | 'permissionUpdate' | 'accountDeactivate' | 'securityReview' | 'settingsUpdate' | 'login';

interface AuditEntry {
  id: string; actor: string; action: AuditAction; resource: string; time: string; ip: string;
}

const entries: AuditEntry[] = [
  { id: 'a1', actor: 'Sara Mahmoud', action: 'roleChange', resource: 'Omar Khaled → Teacher', time: '12 min ago', ip: '192.168.1.24' },
  { id: 'a2', actor: 'Karim Fouad', action: 'permissionUpdate', resource: 'content.publish', time: '1 hour ago', ip: '192.168.1.31' },
  { id: 'a3', actor: 'Sara Mahmoud', action: 'accountDeactivate', resource: 'user:inactive-042', time: '3 hours ago', ip: '192.168.1.24' },
  { id: 'a4', actor: 'System', action: 'securityReview', resource: 'login attempts (3 flagged)', time: '6 hours ago', ip: '—' },
  { id: 'a5', actor: 'Karim Fouad', action: 'settingsUpdate', resource: 'ai.tokenLimit', time: 'yesterday', ip: '192.168.1.31' },
  { id: 'a6', actor: 'Lina Adel', action: 'login', resource: 'web session', time: 'yesterday', ip: '10.0.4.87' },
  { id: 'a7', actor: 'Sara Mahmoud', action: 'roleChange', resource: 'Hana Magdy → Teacher', time: '2 days ago', ip: '192.168.1.24' },
  { id: 'a8', actor: 'Karim Fouad', action: 'settingsUpdate', resource: 'security.passwordPolicy', time: '3 days ago', ip: '192.168.1.31' },
];

const actionMeta: Record<AuditAction, { icon: typeof ScrollText; badge: BadgeVariant }> = {
  roleChange: { icon: KeyRound, badge: 'warning' },
  permissionUpdate: { icon: ShieldCheck, badge: 'info' },
  accountDeactivate: { icon: UserMinus, badge: 'error' },
  securityReview: { icon: ShieldCheck, badge: 'error' },
  settingsUpdate: { icon: Settings, badge: 'default' },
  login: { icon: LogIn, badge: 'success' },
};

export default function AdminAudit() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const toast = useToast();
  const [query, setQuery] = useState('');

  const visible = entries.filter((e) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      e.actor.toLowerCase().includes(q) ||
      e.resource.toLowerCase().includes(q) ||
      t(`auditPage.${e.action}`).toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-8 page-enter">
      <PageHeader
        icon={<ScrollText className="w-6 h-6" />}
        title={t('auditPage.title')}
        subtitle={t('auditPage.subtitle')}
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => toast({ variant: 'success', title: t('auditPage.export'), description: `${visible.length} ${t('auditPage.entries')}` })}
          >
            {t('auditPage.export')}
          </Button>
        }
      />
      <SectionTabs items={adminNav} label={tc('nav.admin')} />

      <div className="max-w-md">
        <Input
          size="sm"
          aria-label={t('auditPage.filter')}
          placeholder={t('auditPage.filter')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4" aria-hidden="true" />}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={<Search className="w-6 h-6" />} title={tc('search.noResults')} description={tc('search.noResultsDesc')} />
      ) : (
        <Card variant="elevated" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="bg-surface-secondary border-b border-surface-border">
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('auditPage.actor')}</th>
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('auditPage.action')}</th>
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('auditPage.resource')}</th>
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('auditPage.time')}</th>
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('auditPage.ip')}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((e) => {
                  const Meta = actionMeta[e.action];
                  const Icon = Meta.icon;
                  return (
                    <tr key={e.id} className="border-b border-surface-border last:border-0 hover:bg-surface-secondary/40 transition-colors">
                      <td className="px-4 py-3.5 text-body-sm font-medium text-text-primary whitespace-nowrap">{e.actor}</td>
                      <td className="px-4 py-3.5">
                        <Badge variant={Meta.badge} dot>
                          <Icon className="w-3 h-3 me-1" aria-hidden="true" />
                          {t(`auditPage.${e.action}`)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-body-sm text-text-secondary">{e.resource}</td>
                      <td className="px-4 py-3.5 text-body-sm text-text-tertiary whitespace-nowrap">{e.time}</td>
                      <td className="px-4 py-3.5 text-body-sm text-text-tertiary">{e.ip}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-surface-border">
            <p className="text-caption text-text-tertiary">{visible.length} {t('auditPage.entries')}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
