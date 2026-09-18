import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { Avatar } from '../../../shared/components/ui/Avatar';
import { IconBox } from '../../../shared/components/ui/IconBox';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { InviteCodesCard } from '../components/InviteCodesCard';
import { useToast } from '../../../shared/components/ui/ToastProvider';
import { cn } from '../../../shared/lib/utils';
import { Users, Search, Plus, Crown, Shield, Briefcase, GraduationCap, KeyRound, ShieldCheck } from 'lucide-react';

type ManagedRole = 'owner' | 'admin' | 'teacher' | 'student';
type ManagedStatus = 'active' | 'inactive';

interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: ManagedRole;
  status: ManagedStatus;
  lastActive: string;
}

const initialUsers: ManagedUser[] = [
  { id: 1, name: 'Ahmed Hassan', email: 'ahmed@learnpilot.io', role: 'owner', status: 'active', lastActive: 'Now' },
  { id: 2, name: 'Sara Al-Ali', email: 'sara@learnpilot.io', role: 'admin', status: 'active', lastActive: '5m ago' },
  { id: 3, name: 'Omar Khaled', email: 'omar@learnpilot.io', role: 'admin', status: 'active', lastActive: '1h ago' },
  { id: 4, name: 'Lina Mansour', email: 'lina@learnpilot.io', role: 'teacher', status: 'active', lastActive: '12m ago' },
  { id: 5, name: 'Yousef Nasser', email: 'yousef@learnpilot.io', role: 'teacher', status: 'inactive', lastActive: '3d ago' },
  { id: 6, name: 'Mariam Adel', email: 'mariam@learnpilot.io', role: 'student', status: 'active', lastActive: '2h ago' },
  { id: 7, name: 'Kareem Sami', email: 'kareem@learnpilot.io', role: 'student', status: 'active', lastActive: 'Yesterday' },
];

const roleMeta: Record<ManagedRole, { label: string; icon: React.ReactNode; tone: 'warning' | 'accent' | 'ai' | 'success' }> = {
  owner: { label: 'access.roleOwner', icon: <Crown className="w-4 h-4" />, tone: 'warning' },
  admin: { label: 'access.roleAdmin', icon: <Shield className="w-4 h-4" />, tone: 'accent' },
  teacher: { label: 'access.roleTeacher', icon: <Briefcase className="w-4 h-4" />, tone: 'ai' },
  student: { label: 'access.roleStudent', icon: <GraduationCap className="w-4 h-4" />, tone: 'success' },
};

const roleOrder: ManagedRole[] = ['student', 'teacher', 'admin', 'owner'];

export default function OwnerAccess() {
  const { t } = useTranslation('owner');
  const toast = useToast();
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | ManagedRole>('all');

  const filtered = users.filter((u) => {
    const matchesQuery = !query || (u.name + ' ' + u.email).toLowerCase().includes(query.toLowerCase());
    const matchesRole = filter === 'all' || u.role === filter;
    return matchesQuery && matchesRole;
  });

  const changeRole = (id: number, next: ManagedRole) => {
    setUsers(users.map((u) => (u.id === id ? { ...u, role: next } : u)));
    toast({ variant: 'success', title: t('access.roleAssigned') });
  };

  const toggleStatus = (id: number) => {
    setUsers(users.map((u) => (u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u)));
  };

  const filterTabs: ('all' | ManagedRole)[] = ['all', 'student', 'teacher', 'admin', 'owner'];

  return (
    <div className="space-y-8 pb-8 page-enter">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-warning-bg flex items-center justify-center ring-1 ring-inset ring-warning/20">
            <KeyRound className="w-6 h-6 text-warning" />
          </div>
          <div>
            <h1 className="display-sm text-text-primary">{t('access.title')}</h1>
            <p className="body text-text-secondary mt-1">{t('access.subtitle')}</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>{t('access.addUser')}</Button>
      </div>

      {/* Admin management notice */}
      <Card variant="outlined" padding="sm" className="bg-surface-secondary border-surface-border">
        <div className="flex items-start gap-3">
          <IconBox tone="warning" size="sm"><ShieldCheck /></IconBox>
          <div>
            <p className="text-sm font-semibold text-text-primary">{t('access.adminManagement')}</p>
            <p className="text-caption text-text-secondary">{t('access.superAdminNote')} {t('access.adminNote')}</p>
          </div>
        </div>
      </Card>

      {/* Owner-issued invite / security codes for Admin accounts */}
      <InviteCodesCard />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-tertiary absolute start-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('access.searchPlaceholder')}
            aria-label={t('access.searchPlaceholder')}
            className="w-full ps-9 pe-3 py-2.5 text-sm bg-surface border border-surface-border rounded-lg focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap bg-surface border border-surface-border rounded-lg p-1">
          {filterTabs.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
                filter === f ? 'bg-warning-bg text-warning' : 'text-text-secondary hover:bg-surface-secondary',
              )}
            >
              {f === 'all' ? t('access.allUsers') : t(roleMeta[f].label)}
            </button>
          ))}
        </div>
      </div>
{/* User list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users />}
          tone="warning"
          title={t('access.emptyTitle')}
          description={t('access.emptyDesc')}
          className="py-14"
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const meta = roleMeta[u.role];
            return (
              <Card key={u.id} variant="elevated" padding="md" className="flex flex-wrap items-center gap-3">
                <Avatar name={u.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text-primary">{u.name}</p>
                  <p className="text-caption text-text-tertiary">{u.email} · {t('access.lastActive')}: {u.lastActive}</p>
                </div>
                <Badge variant={u.status === 'active' ? 'success' : 'outline'} size="sm">
                  {u.status === 'active' ? t('access.statusActive') : t('access.statusInactive')}
                </Badge>
                <IconBox tone={meta.tone} size="sm">{meta.icon}</IconBox>
                <div className="flex items-center gap-1" role="group" aria-label={`${t('access.changeRole')} ${u.name}`}>
                  {roleOrder.map((r) => (
                    <button
                      key={r}
                      type="button"
                      title={`${t('access.changeRole')}: ${t(roleMeta[r].label)}`}
                      onClick={() => changeRole(u.id, r)}
                      aria-label={`${t('access.changeRole')} ${u.name} ${t(roleMeta[r].label)}`}
                      aria-pressed={u.role === r}
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold transition-all',
                        u.role === r ? 'bg-warning-bg text-warning ring-1 ring-inset ring-warning/30' : 'bg-surface-secondary text-text-tertiary hover:bg-surface-tertiary',
                      )}
                    >
                      {roleMeta[r].icon}
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleStatus(u.id)}
                  aria-label={`${u.status === 'active' ? t('access.statusInactive') : t('access.statusActive')} ${u.name}`}
                >
                  {u.status === 'active' ? t('access.statusInactive') : t('access.statusActive')}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}