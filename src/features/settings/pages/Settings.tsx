import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { Avatar } from '../../../shared/components/ui/Avatar';
import { useToast } from '../../../shared/components/ui/ToastProvider';
import { useTheme } from '../../../app/layout/ThemeProvider';
import { User, Shield, Bell, Globe, Palette, Save, Monitor } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';

interface SettingsTab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export default function SettingsPage() {
  const { t } = useTranslation('settings');
  const { mode, setMode } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs: SettingsTab[] = [
    { id: 'profile', label: t('profile'), icon: <User className="w-4 h-4" /> },
    { id: 'appearance', label: t('appearance'), icon: <Palette className="w-4 h-4" /> },
    { id: 'notifications', label: t('notifications'), icon: <Bell className="w-4 h-4" /> },
    { id: 'security', label: t('security'), icon: <Shield className="w-4 h-4" /> },
    { id: 'privacy', label: t('privacy'), icon: <Globe className="w-4 h-4" /> },
    { id: 'sessions', label: t('sessions'), icon: <Monitor className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 pb-8">
      <h1 className="display-sm text-text-primary">{t('settings')}</h1>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-64 flex-shrink-0">
          <Card variant="elevated" padding="sm" className="sticky top-6">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  activeTab === tab.id ? 'bg-brand-bg text-brand' : 'text-text-secondary hover:bg-surface-secondary',
                )}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </Card>
        </div>
        <div className="flex-1 min-w-0">
          <Card variant="elevated" padding="lg">
            {activeTab === 'profile' && <ProfileSettings />}
            {activeTab === 'appearance' && <AppearanceSettings mode={mode} setMode={setMode} />}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'privacy' && <PrivacySettings />}
            {activeTab === 'sessions' && <SessionsSettings />}
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProfileSettings() {
  const { t } = useTranslation('settings');
  const toast = useToast();
  return (
    <div className="space-y-6">
      <h2 className="h3 text-text-primary">{t('profileInfo')}</h2>
      <div className="flex items-start gap-6">
        <Avatar src="/avatars/student.svg" name="Ahmed Hassan" size="2xl" status="online" />
        <div><Button variant="secondary" size="sm">{t('changePhoto')}</Button></div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label={t('displayName')} defaultValue="Ahmed Hassan" />
        <Input label={t('email')} type="email" defaultValue="ahmed.hassan@example.com" />
      </div>
      <div className="flex justify-end">
        <Button variant="primary" leftIcon={<Save className="w-4 h-4" />} onClick={() => toast({ variant: 'success', title: t('profileSaved'), description: t('profileSavedDesc') })}>
          {t('saveChanges')}
        </Button>
      </div>
    </div>
  );
}

function AppearanceSettings({ mode, setMode }: { mode: 'light' | 'dark' | 'system'; setMode: (m: 'light' | 'dark' | 'system') => void }) {
  const { t } = useTranslation('settings');
  return (
    <div className="space-y-6">
      <h2 className="h3 text-text-primary">{t('appearance')}</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-label font-medium text-text-primary mb-1">{t('theme')}</label>
          <div className="flex gap-2">
            {([{ id: 'light', label: t('light') }, { id: 'dark', label: t('dark') }, { id: 'system', label: t('system') }] as const).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setMode(opt.id)}
className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                mode === opt.id ? 'bg-brand text-white' : 'text-text-secondary hover:bg-surface-secondary',
              )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationSettings() {
  const { t } = useTranslation('settings');
  return (
    <div className="space-y-6">
      <h2 className="h3 text-text-primary">{t('notifications')}</h2>
      <ToggleRow label={t('learningReminders')} description={t('learningRemindersDesc')} defaultChecked />
      <ToggleRow label={t('quizResults')} description={t('quizResultsDesc')} defaultChecked />
      <ToggleRow label={t('aiTutorMessages')} description={t('aiTutorMessagesDesc')} />
    </div>
  );
}

function ToggleRow({ label, description, defaultChecked }: { label: string; description: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-surface-border last:border-0">
      <div>
        <p className="font-medium text-text-primary">{label}</p>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
      <label className="relative inline-flex h-5 w-9 items-center rounded-full">
        <input type="checkbox" defaultChecked={defaultChecked} className="h-0 w-0 opacity-0 peer" />
        <span className="absolute inline-block h-3 w-3 rounded-full bg-white peer-checked:translate-x-4 peer-checked:bg-brand"></span>
      </label>
    </div>
  );
}

function SecuritySettings() {
  const { t } = useTranslation('settings');
  return (
    <div className="space-y-6">
      <h2 className="h3 text-text-primary">{t('security')}</h2>
      <Input label={t('currentPassword')} type="password" />
      <Input label={t('newPassword')} type="password" />
      <Input label={t('confirmPassword')} type="password" />
      <Button variant="primary">{t('updatePassword')}</Button>
    </div>
  );
}

function PrivacySettings() {
  const { t } = useTranslation('settings');
  return (
    <div className="space-y-6">
      <h2 className="h3 text-text-primary">{t('privacyData')}</h2>
      <Button variant="surface-secondary" className="text-error">
        {t('deleteAccount')}
      </Button>
    </div>
  );
}

function SessionsSettings() {
  const { t } = useTranslation('settings');
  return (
    <div className="space-y-6">
      <h2 className="h3 text-text-primary">{t('activeSessions')}</h2>
      <p className="text-sm text-text-secondary">{t('devicesInfo')}</p>
    </div>
  );
}
