import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Search, UserPlus } from 'lucide-react';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { Badge } from '../../../shared/components/ui/Badge';
import { Avatar } from '../../../shared/components/ui/Avatar';
import { Button } from '../../../shared/components/ui/Button';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { useToast } from '../../../shared/components/ui/ToastProvider';
import { SectionTabs } from '../../../shared/components/layout/SectionTabs';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { adminNav } from '../../../shared/components/layout/navGroups';

interface UserRow { id: string; name: string; email: string; role: 'students' | 'teachers' | 'admins'; active: boolean; lastActive: string; }

const users: UserRow[] = [
  { id: 'u1', name: 'Omar Khaled', email: 'omar.k@learnpilot.io', role: 'students', active: true, lastActive: '2h' },
  { id: 'u2', name: 'Nadia Fathy', email: 'nadia.f@learnpilot.io', role: 'teachers', active: true, lastActive: '35m' },
  { id: 'u3', name: 'Hassan Ali', email: 'hassan.ali@learnpilot.io', role: 'admins', active: true, lastActive: '1d' },
  { id: 'u4', name: 'Salma Tarek', email: 'salma.t@learnpilot.io', role: 'students', active: false, lastActive: '12d' },
  { id: 'u5', name: 'Youssef Adel', email: 'youssef.a@learnpilot.io', role: 'students', active: true, lastActive: '5h' },
  { id: 'u6', name: 'Mariam Sameh', email: 'mariam.s@learnpilot.io', role: 'teachers', active: false, lastActive: '6d' },
];

export default function AdminUsers() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const toast = useToast();
  const [items, setItems] = useState<UserRow[]>(users);
  const [filter, setFilter] = useState<'all' | UserRow['role']>('all');
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRow['role']>('students');
  const [formErr, setFormErr] = useState('');

  const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const addUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim().length < 2) { setFormErr(t('userPage.nameRequired')); return; }
    if (!emailOk(newEmail)) { setFormErr(t('userPage.emailInvalid')); return; }
    setItems((cur) => [
      { id: `u-new-${Date.now()}`, name: newName.trim(), email: newEmail.trim(), role: newRole, active: true, lastActive: t('userPage.justNow') },
      ...cur,
    ]);
    toast({ variant: 'success', title: t('userPage.userAdded'), description: newName.trim() });
    setAddOpen(false); setNewName(''); setNewEmail(''); setNewRole('students'); setFormErr('');
  };

  const openAdd = () => { setAddOpen(true); setFormErr(''); };
  const closeAdd = () => { setAddOpen(false); setNewName(''); setNewEmail(''); setNewRole('students'); setFormErr(''); };

  const visible = useMemo(() => items
    .filter((u) => (filter === 'all' ? true : u.role === filter))
    .filter((u) => (u.name + u.email).toLowerCase().includes(query.trim().toLowerCase())),
  [items, filter, query]);

  const filters: Array<{ key: 'all' | UserRow['role']; label: string }> = [
    { key: 'all', label: t('userPage.all') },
    { key: 'students', label: t('userPage.students') },
    { key: 'teachers', label: t('userPage.teachers') },
    { key: 'admins', label: t('userPage.admins') },
  ];

  return (
    <div className="space-y-6 pb-8 page-enter">
      <PageHeader
        icon={<Users className="w-6 h-6" />}
        title={t('userPage.title')}
        subtitle={t('userPage.subtitle')}
        actions={<Button variant="primary" leftIcon={<UserPlus className="w-4 h-4" />} onClick={openAdd}>{t('userPage.addUser')}</Button>}
      />
      <SectionTabs items={adminNav} label={tc('nav.admin')} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 flex-wrap" role="tablist" aria-label={t('userPage.role')}>
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${filter === f.key ? 'bg-brand-bg text-brand border-brand-border font-semibold' : 'bg-surface text-text-secondary border-surface-border hover:bg-surface-secondary'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="w-60">
          <Input size="sm" aria-label={t('userPage.searchPlaceholder')} placeholder={t('userPage.searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} leftIcon={<Search className="w-4 h-4" aria-hidden="true" />} />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={<Users className="w-6 h-6" />} title={t('userPage.emptyTitle')} description={t('userPage.emptyDesc')} />
      ) : (
        <Card variant="elevated" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-secondary border-b border-surface-border">
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('userPage.user')}</th>
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('userPage.role')}</th>
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('userPage.status')}</th>
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('userPage.lastActive')}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((u) => (
                  <tr key={u.id} className="border-b border-surface-border last:border-0 hover:bg-surface-secondary/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar src="/avatars/student.svg" name={u.name} size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium text-text-primary truncate">{u.name}</p>
                          <p className="text-caption text-text-tertiary truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={u.role === 'admins' ? 'warning' : u.role === 'teachers' ? 'ai' : 'default'}>{t(`userPage.${u.role}`)}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={u.active ? 'success' : 'default'} dot>{t(u.active ? 'userPage.active' : 'userPage.inactive')}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-body-sm text-text-secondary">{u.lastActive}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-scale-in" onClick={closeAdd}>
          <div role="dialog" aria-modal="true" aria-label={t('userPage.addUserTitle')} className="w-full max-w-md bg-surface border border-surface-border rounded-2xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="h4 text-text-primary mb-1">{t('userPage.addUserTitle')}</h2>
            <p className="body-sm text-text-secondary mb-4">{t('userPage.addUserDesc')}</p>
            <form className="space-y-4" onSubmit={addUser} noValidate>
              <Input label={t('userPage.newName')} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('userPage.newNamePlaceholder')} required />
              <Input label={t('userPage.newEmail')} type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="name@learnpilot.io" required />
              <div>
                <span className="text-label font-medium text-text-primary">{t('userPage.role')}</span>
                <div className="mt-1.5 flex gap-1.5 flex-wrap">
                  {(['students', 'teachers', 'admins'] as const).map((r) => (
                    <button key={r} type="button" aria-pressed={newRole === r} onClick={() => setNewRole(r)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${newRole === r ? 'bg-brand-bg text-brand border-brand-border font-semibold' : 'bg-surface text-text-secondary border-surface-border hover:bg-surface-secondary'}`}>
                      {t(`userPage.${r}`)}
                    </button>
                  ))}
                </div>
              </div>
              {formErr && <p role="alert" className="text-sm text-error bg-error-bg border border-error/20 rounded-lg px-3 py-2.5">{formErr}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={closeAdd}>{t('userPage.cancel')}</Button>
                <Button type="submit" variant="primary" size="sm">{t('userPage.addUser')}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
