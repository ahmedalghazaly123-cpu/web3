import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollText, Search, Download } from 'lucide-react';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { SectionTabs } from '../../../shared/components/layout/SectionTabs';
import { ownerNav } from '../../../shared/components/layout/navGroups';

interface Entry {
  id: string;
  actor: string;
  actionKey: string;
  resource: string;
  time: string;
  ip: string;
  severity?: 'warning' | 'error';
}

const ENTRIES: Entry[] = [
  { id: 'a1', actor: 'Ahmed Hassan (Owner)', actionKey: 'roleChange', resource: 'sara@learnpilot.app → admin', time: '12 min', ip: '41.62.14.7' },
  { id: 'a2', actor: 'Mona Adel (Admin)', actionKey: 'permissionUpdate', resource: 'content-team', time: '1 h', ip: '41.62.19.44' },
  { id: 'a3', actor: 'Mona Adel (Admin)', actionKey: 'accountDeactivate', resource: '3 inactive teacher accounts', time: '3 h', ip: '41.62.19.44', severity: 'warning' },
  { id: 'a4', actor: 'System', actionKey: 'securityReview', resource: '3 suspicious sign-in attempts resolved', time: '5 h', ip: '—', severity: 'error' },
  { id: 'a5', actor: 'Ahmed Hassan (Owner)', actionKey: 'settingsUpdate', resource: 'platform.maintenanceMode = off', time: '—', ip: '41.62.14.7' },
  { id: 'a6', actor: 'Omar Khaled (Admin)', actionKey: 'login', resource: 'web', time: '—', ip: '41.62.8.221' },
];

export default function OwnerAudit() {
  const { t } = useTranslation('owner');
  const { t: tc } = useTranslation('common');
  const [query, setQuery] = useState('');

  const visible = ENTRIES.filter((e) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      e.actor.toLowerCase().includes(q) ||
      e.resource.toLowerCase().includes(q) ||
      t(`audit.actions.${e.actionKey}`).toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-8 page-enter">
      <PageHeader
        icon={<ScrollText className="w-6 h-6" />}
        tone="warning"
        title={t('audit.title')}
        subtitle={t('audit.subtitle')}
        actions={
          <Button variant="secondary" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={() => window.print()}>
            {t('audit.export')}
          </Button>
        }
      />
      <SectionTabs items={ownerNav} label={tc('nav.owner')} />

      <div className="max-w-md">
        <Input
          size="sm"
          aria-label={t('audit.filter')}
          placeholder={t('audit.filter')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4" aria-hidden="true" />}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Search className="w-6 h-6" />}
          tone="neutral"
          title={tc('search.noResults')}
          description={tc('search.noResultsDesc')}
        />
      ) : (
        <Card variant="elevated" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="bg-surface-secondary border-b border-surface-border">
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('audit.actor')}</th>
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('audit.action')}</th>
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('audit.resource')}</th>
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('audit.time')}</th>
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('audit.ip')}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((e) => (
                  <tr key={e.id} className="border-b border-surface-border last:border-0 hover:bg-surface-secondary/40 transition-colors">
                    <td className="px-4 py-3.5 text-body-sm font-medium text-text-primary whitespace-nowrap">{e.actor}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant={e.severity === 'error' ? 'error' : e.severity === 'warning' ? 'warning' : 'default'} dot>
                        {t(`audit.actions.${e.actionKey}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-body-sm text-text-secondary">{e.resource}</td>
                    <td className="px-4 py-3.5 text-body-sm text-text-tertiary whitespace-nowrap">{e.time}</td>
                    <td className="px-4 py-3.5 text-body-sm text-text-tertiary">{e.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-surface-border">
            <p className="text-caption text-text-tertiary">{visible.length} {t('audit.entries')}</p>
          </div>
        </Card>
      )}

    </div>
  );
}
