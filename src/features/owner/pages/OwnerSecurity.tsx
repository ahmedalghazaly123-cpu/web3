import { useTranslation } from 'react-i18next';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { IconBox } from '../../../shared/components/ui/IconBox';
import { useToast } from '../../../shared/components/ui/ToastProvider';
import { cn } from '../../../shared/lib/utils';
import {
  ShieldCheck, ShieldAlert, Monitor, Lock, Activity,
  LogIn, LogOut, KeyRound, Camera,
} from 'lucide-react';

interface SessionRow {
  id: number;
  user: string;
  role: 'owner' | 'admin';
  ip: string;
  device: string;
  since: string;
  status: 'active' | 'flagged';
}

interface AccountRow {
  id: number;
  user: string;
  email: string;
  status: 'secure' | 'review' | 'reset';
  lastSeen: string;
}

export default function OwnerSecurity() {
  const { t } = useTranslation('owner');
  const toast = useToast();

  const sessions: SessionRow[] = [
    { id: 1, user: 'Ahmed Hassan', role: 'owner', ip: '192.168.1.10', device: 'Windows · Chrome', since: 'Now', status: 'active' },
    { id: 2, user: 'Sara Al-Ali', role: 'admin', ip: '10.20.30.5', device: 'macOS · Safari', since: '12m ago', status: 'active' },
    { id: 3, user: 'Omar Khaled', role: 'admin', ip: '41.10.21.77', device: 'Linux · Firefox', since: '1h ago', status: 'flagged' },
  ];

  const accounts: AccountRow[] = [
    { id: 1, user: 'Ahmed Hassan', email: 'ahmed@learnpilot.io', status: 'secure', lastSeen: 'Now' },
    { id: 2, user: 'Sara Al-Ali', email: 'sara@learnpilot.io', status: 'secure', lastSeen: '12m ago' },
    { id: 3, user: 'Omar Khaled', email: 'omar@learnpilot.io', status: 'reset', lastSeen: '1h ago' },
  ];

  const settings = [
    { key: 'twoFactor', on: true },
    { key: 'sessions', on: true },
    { key: 'ipAllowlist', on: false },
    { key: 'passwordPolicy', on: true },
    { key: 'auditRetention', on: true },
  ];

  const statusMeta: Record<AccountRow['status'], { variant: 'success' | 'warning' | 'error'; label: string }> = {
    secure: { variant: 'success', label: t('security.statuses.secure') },
    review: { variant: 'warning', label: t('security.statuses.review') },
    reset: { variant: 'error', label: t('security.statuses.reset') },
  };

  return (
    <div className="space-y-8 pb-8 page-enter">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-warning-bg flex items-center justify-center ring-1 ring-inset ring-warning/20">
          <ShieldCheck className="w-6 h-6 text-warning" />
        </div>
        <div>
          <h1 className="display-sm text-text-primary">{t('security.title')}</h1>
          <p className="body text-text-secondary mt-1">{t('security.subtitle')}</p>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard tone="success" icon={<ShieldCheck className="w-5 h-5" />} value={t('security.statuses.secure')} label={t('security.accountStatus')} />
        <StatusCard tone="success" icon={<Lock className="w-5 h-5" />} value="2FA" label={t('security.accessStatus')} />
        <StatusCard tone="warning" icon={<Monitor className="w-5 h-5" />} value="3" label={t('security.activeSessions')} />
        <StatusCard tone="info" icon={<Activity className="w-5 h-5" />} value="42" label={t('security.activityTitle')} />
      </div>
{/* Session / access overview */}
      <Card variant="elevated" padding="lg">
        <div className="flex items-center gap-3 mb-4">
          <IconBox tone="warning" size="md"><Monitor /></IconBox>
          <div>
            <h2 className="h3 text-text-primary">{t('security.sessionOverview')}</h2>
            <p className="text-caption text-text-secondary">{t('security.sessionsDesc')}</p>
          </div>
        </div>
        <div className="space-y-2">
          {sessions.map((s) => (
            <div key={s.id} className={cn(
              'flex flex-wrap items-center gap-3 p-3 rounded-xl',
              s.status === 'flagged' ? 'bg-warning-bg/30 border border-warning-border' : 'bg-surface-secondary border border-surface-border',
            )}>
              <IconBox tone={s.role === 'owner' ? 'warning' : 'accent'} size="sm">
                {s.role === 'owner' ? <CrownStack /> : <ShieldAlert className="w-4 h-4" />}
              </IconBox>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text-primary leading-none">
                  {s.user}
                  <Badge variant={s.role === 'owner' ? 'warning' : 'info'} size="xs" className="ms-1">{s.role}</Badge>
                </p>
                <p className="text-caption text-text-tertiary">{s.device} · {s.ip} · {s.since}</p>
              </div>
              <Badge variant={s.status === 'flagged' ? 'error' : 'success'} size="sm">
                {s.status === 'flagged' ? t('security.statuses.review') : t('security.statuses.secure')}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<LogOut className="w-4 h-4" />}
                onClick={() => toast({ variant: 'info', title: t('security.signout'), description: s.user })}
              >
                {t('security.signout')}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Account status */}
      <Card variant="elevated" padding="lg">
        <div className="flex items-center gap-3 mb-4">
          <IconBox tone="brand" size="md"><ShieldCheck /></IconBox>
          <div>
            <h2 className="h3 text-text-primary">{t('security.accountStatus')}</h2>
            <p className="text-caption text-text-secondary">{t('security.activityTitle')} · {t('security.subtitle')}</p>
          </div>
        </div>
        <div className="space-y-2">
          {accounts.map((a) => {
            const m = statusMeta[a.status];
            return (
              <div key={a.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-surface-secondary border border-surface-border">
                <IconBox tone={a.status === 'secure' ? 'success' : a.status === 'review' ? 'warning' : 'error'} size="sm">
                  {a.status === 'secure' ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                </IconBox>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-primary leading-none">{a.user}</p>
                  <p className="text-caption text-text-tertiary">{a.email} · {a.lastSeen}</p>
                </div>
                <Badge variant={m.variant} size="sm">{m.label}</Badge>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Security settings */}
      <Card variant="elevated" padding="lg">
        <div className="flex items-center gap-3 mb-4">
          <IconBox tone="info" size="md"><Lock /></IconBox>
          <h2 className="h3 text-text-primary">{t('security.securitySettings')}</h2>
        </div>
        <div className="space-y-3">
          {settings.map((s) => (
            <label key={s.key} className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-surface-secondary border border-surface-border cursor-pointer">
              <span className="text-sm font-medium text-text-primary">{t('security.settings.' + s.key)}</span>
              <input
                type="checkbox"
                defaultChecked={s.on}
                aria-label={t('security.settings.' + s.key)}
                className="w-5 h-5 rounded border-surface-border text-warning focus:ring-warning/40 accent-warning"
              />
            </label>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-caption text-text-tertiary">
          <LogIn className="w-4 h-4 text-success" />
          <span>{t('activity.security')}: {t('activity.securityTarget')}</span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-caption text-text-tertiary">
          <Camera className="w-4 h-4 text-error" />
          <span>{t('access.adminNote')}</span>
        </div>
      </Card>
    </div>
  );
}

function CrownStack() {
  return <KeyRound className="w-4 h-4" />;
}

function StatusCard({ tone, icon, value, label }: { tone: 'success' | 'warning' | 'info' | 'error'; icon: React.ReactNode; value: string; label: string }) {
  return (
    <Card variant="elevated" padding="md" className="card-lift">
      <div className="flex items-center gap-3">
        <IconBox tone={tone} size="md">{icon}</IconBox>
        <div>
          <span className="text-lg font-bold text-text-primary">{value}</span>
          <p className="text-caption text-text-tertiary">{label}</p>
        </div>
      </div>
    </Card>
  );
}