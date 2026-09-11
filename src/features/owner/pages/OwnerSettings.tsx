import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Save, Globe, Palette, Database, ShieldCheck } from 'lucide-react';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { useToast } from '../../../shared/components/ui/ToastProvider';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { SectionTabs } from '../../../shared/components/layout/SectionTabs';
import { ownerNav } from '../../../shared/components/layout/navGroups';
import { cn } from '../../../shared/lib/utils';

function Toggle({ on, label, desc, onToggle, tone = 'brand' }: {
  on: boolean; label: string; desc?: string; onToggle: () => void; tone?: 'brand' | 'warning';
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={cn(
        'w-full flex items-center justify-between gap-4 p-4 rounded-xl border text-start transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        on
          ? tone === 'warning' ? 'bg-warning-bg/50 border-warning-border' : 'bg-brand-bg/50 border-brand-border'
          : 'bg-surface border-surface-border hover:bg-surface-secondary',
      )}
    >
      <span className="min-w-0">
        <span className="block text-body-sm font-semibold text-text-primary">{label}</span>
        {desc && <span className="block text-caption text-text-secondary mt-0.5">{desc}</span>}
      </span>
      <span
        className={cn(
          'relative inline-flex w-10 h-6 rounded-full flex-shrink-0 transition-colors',
          on ? tone === 'warning' ? 'bg-warning' : 'bg-brand' : 'bg-surface-border-strong',
        )}
        aria-hidden="true"
      >
        <span className={cn('absolute top-0.5 start-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', on && 'translate-x-4 rtl:-translate-x-4')} />
      </span>
    </button>
  );
}

export default function OwnerSettings() {
  const { t } = useTranslation('owner');
  const { t: tc } = useTranslation('common');
  const toast = useToast();

  const [name, setName] = useState('LearnPilot');
  const [url, setUrl] = useState('https://learnpilot.app');
  const [lang, setLang] = useState('ar');
  const [tz, setTz] = useState('Africa/Cairo');
  const [retention, setRetention] = useState('365');
  const [maintenance, setMaintenance] = useState(false);
  const [registration, setRegistration] = useState(true);
  const [aiFeatures, setAiFeatures] = useState(true);

  const save = () => toast({ variant: 'success', title: t('settingsPage.saved') });

  return (
    <div className="space-y-6 pb-8 page-enter">
      <PageHeader
        icon={<Settings className="w-6 h-6" />}
        tone="warning"
        title={t('settingsPage.title')}
        subtitle={t('settingsPage.subtitle')}
        actions={<Button variant="primary" size="sm" leftIcon={<Save className="w-4 h-4" />} onClick={save}>{t('settingsPage.save')}</Button>}
      />
      <SectionTabs items={ownerNav} label={tc('nav.owner')} />

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <Card variant="elevated" padding="lg" className="space-y-4">
          <h2 className="h4 text-text-primary flex items-center gap-2"><Globe className="w-5 h-5 text-brand" aria-hidden="true" />{t('settingsPage.general')}</h2>
          <Input label={t('settingsPage.platformName')} value={name} onChange={(e) => setName(e.target.value)} />
          <Input label={t('settingsPage.platformUrl')} type="url" value={url} onChange={(e) => setUrl(e.target.value)} />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label={t('settingsPage.defaultLanguage')} value={lang} onChange={(e) => setLang(e.target.value)} />
            <Input label={t('settingsPage.timezone')} value={tz} onChange={(e) => setTz(e.target.value)} />
          </div>
        </Card>

        <Card variant="elevated" padding="lg" className="space-y-3">
          <h2 className="h4 text-text-primary flex items-center gap-2"><Palette className="w-5 h-5 text-brand" aria-hidden="true" />{t('settingsPage.features')}</h2>
          <Toggle on={maintenance} onToggle={() => setMaintenance(!maintenance)} tone="warning" label={t('settingsPage.maintenanceMode')} desc={t('settingsPage.maintenanceDesc')} />
          <Toggle on={registration} onToggle={() => setRegistration(!registration)} label={t('settingsPage.allowRegistration')} desc={t('settingsPage.allowRegistrationDesc')} />
          <Toggle on={aiFeatures} onToggle={() => setAiFeatures(!aiFeatures)} label={t('settingsPage.aiFeatures')} desc={t('settingsPage.aiFeaturesDesc')} />
          {maintenance && <Badge variant="warning" dot>{t('settingsPage.maintenanceMode')}</Badge>}
        </Card>

        <Card variant="elevated" padding="lg" className="space-y-4">
          <h2 className="h4 text-text-primary flex items-center gap-2"><Database className="w-5 h-5 text-brand" aria-hidden="true" />{t('settingsPage.data')}</h2>
          <Input label={t('settingsPage.dataRetention')} type="number" min={30} value={retention} onChange={(e) => setRetention(e.target.value)} />
        </Card>

        <Card variant="elevated" padding="lg" className="space-y-3">
          <h2 className="h4 text-text-primary flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-brand" aria-hidden="true" />{t('settingsPage.security')}</h2>
          <p className="text-body-sm text-text-secondary">{t('access.superAdminNote')}</p>
        </Card>
      </div>
    </div>
  );
}
