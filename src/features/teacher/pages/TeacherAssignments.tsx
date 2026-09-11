import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardCheck, Plus, Send } from 'lucide-react';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { Input } from '../../../shared/components/ui/Input';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { ProgressBar } from '../../../shared/components/ui/ProgressBar';
import { SectionTabs } from '../../../shared/components/layout/SectionTabs';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { teacherNav } from '../../../shared/components/layout/navGroups';
import { useToast } from '../../../shared/components/ui/ToastProvider';

interface Assignment {
  id: string; title: string; classKey: string; due: string; points: number;
  submitted: number; total: number; graded: number; upcoming: boolean;
}

const assignments: Assignment[] = [
  { id: 'a1', title: 'Derivatives Problem Set 4', classKey: 'classes.calculus', due: 'May 12', points: 20, submitted: 21, total: 24, graded: 18, upcoming: true },
  { id: 'a2', title: 'Matrix Operations Worksheet', classKey: 'classes.linearAlgebra', due: 'May 10', points: 15, submitted: 19, total: 19, graded: 12, upcoming: true },
  { id: 'a3', title: 'Kinematics Lab Report', classKey: 'classes.physics', due: 'May 5', points: 25, submitted: 24, total: 27, graded: 24, upcoming: false },
  { id: 'a4', title: 'Limits Practice Quiz', classKey: 'classes.calculus', due: 'Apr 28', points: 10, submitted: 24, total: 24, graded: 24, upcoming: false },
];

export default function TeacherAssignments() {
  const { t } = useTranslation('teacher');
  const { t: tc } = useTranslation('common');
  const toast = useToast();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [points, setPoints] = useState('');
  const [formErr, setFormErr] = useState('');
  const [items, setItems] = useState<Assignment[]>(assignments);

  const visible = items.filter((a) => filter === 'all' || (filter === 'upcoming' ? a.upcoming : !a.upcoming));
  const dueOk = dueDate !== '';
  const pointsNum = Number(points);
  const pointsOk = points.trim() !== '' && Number.isFinite(pointsNum) && pointsNum > 0 && pointsNum <= 100;
  const canPublish = title.trim().length > 0 && dueOk && pointsOk;

  const publish = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length === 0) { setFormErr(t('assignment.titleRequired')); return; }
    if (!dueOk) { setFormErr(t('assignment.dueRequired')); return; }
    if (!pointsOk) { setFormErr(t('assignment.pointsInvalid')); return; }
    setFormErr('');
    setItems((cur) => [
      { id: `a-${Date.now()}`, title: title.trim(), classKey: 'classes.calculus', due: dueDate, points: pointsNum, submitted: 0, total: 24, graded: 0, upcoming: true },
      ...cur,
    ]);
    toast({ variant: 'success', title: t('assignment.published'), description: title.trim() });
    setTitle(''); setDueDate(''); setPoints('');
    setFilter('upcoming');
  };

  return (
    <div className="space-y-6 pb-8 page-enter">
      <PageHeader
        icon={<ClipboardCheck className="w-6 h-6" />}
        title={t('assignment.title')}
        subtitle={t('assignment.subtitle')}
        actions={<Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => document.getElementById('new-assignment')?.scrollIntoView({ behavior: 'smooth' })}>{t('assignment.newAssignment')}</Button>}
      />
      <SectionTabs items={teacherNav} label={tc('nav.teacher')} />
      <Card id="new-assignment" variant="elevated" padding="lg">
        <h2 className="h4 text-text-primary mb-4">{t('assignment.newAssignment')}</h2>
        <form
          className="grid gap-4 sm:grid-cols-3"
          onSubmit={publish}
          noValidate
        >
          <Input label={t('assignment.titleLabel')} required placeholder={t('assignment.titlePlaceholder')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label={t('assignment.dueDate')} required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <Input label={t('assignment.points')} required type="number" min={1} max={100} placeholder="20" value={points} onChange={(e) => setPoints(e.target.value)} error={!pointsOk && points.trim() !== '' ? t('assignment.pointsInvalid') : undefined} />
          {formErr && (
            <p role="alert" className="sm:col-span-3 text-sm text-error bg-error-bg border border-error/20 rounded-lg px-3 py-2.5">{formErr}</p>
          )}
          <div className="sm:col-span-3 flex justify-end">
            <Button type="submit" variant="primary" leftIcon={<Send className="w-4 h-4" />} disabled={!canPublish}>{t('assignment.publish')}</Button>
          </div>
        </form>
      </Card>
      <div className="flex gap-2" role="tablist" aria-label={t('assignment.title')}>
        {(['all', 'upcoming', 'past'] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
              filter === f ? 'bg-brand-bg text-brand border-brand-border font-semibold' : 'bg-surface text-text-secondary border-surface-border hover:bg-surface-secondary'
            }`}
          >
            {f === 'all' ? t('assignment.total') : f === 'upcoming' ? t('assignment.upcoming') : t('assignment.past')}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={<ClipboardCheck className="w-6 h-6" />} title={t('assignment.emptyTitle')} description={t('assignment.emptyDesc')} illustration="/illustrations/empty-assignments.svg" />
      ) : (
        <Card variant="elevated" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead>
                <tr className="bg-surface-secondary border-b border-surface-border">
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('assignment.table.assignment')}</th>
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('assignment.table.class')}</th>
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('assignment.table.due')}</th>
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('assignment.table.progress')}</th>
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('assignment.table.status')}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a.id} className="border-b border-surface-border last:border-0 hover:bg-surface-secondary/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-text-primary">{a.title}</p>
                      <p className="text-caption text-text-tertiary">{a.points} {t('assignment.points')}</p>
                    </td>
                    <td className="px-4 py-3.5 text-body-sm text-text-secondary">{t(a.classKey)}</td>
                    <td className="px-4 py-3.5 text-body-sm text-text-secondary">{a.due}</td>
                    <td className="px-4 py-3.5 min-w-[140px]">
                      <ProgressBar value={Math.round((a.submitted / a.total) * 100)} variant="brand" size="sm" />
                      <p className="text-caption text-text-tertiary mt-1">{a.submitted}/{a.total} {t('assignment.submissions')}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      {a.graded >= a.submitted ? (
                        <Badge variant="success" dot>{t('assignment.graded')}</Badge>
                      ) : (
                        <Badge variant="warning" dot>{t('assignment.pending')}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
