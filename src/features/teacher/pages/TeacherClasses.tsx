import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Plus, BookOpen } from 'lucide-react';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Avatar } from '../../../shared/components/ui/Avatar';
import { ProgressBar } from '../../../shared/components/ui/ProgressBar';
import { Input } from '../../../shared/components/ui/Input';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { SectionTabs } from '../../../shared/components/layout/SectionTabs';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { teacherNav } from '../../../shared/components/layout/navGroups';
import { useToast } from '../../../shared/components/ui/ToastProvider';

interface ClassInfo {
  id: string; nameKey: string; grade: string; students: number;
  average: number; completion: number; lessonsToPlan: number;
  roster: string[];
}

const classes: ClassInfo[] = [
  { id: 'c1', nameKey: 'classes.calculus', grade: '10-A', students: 24, average: 78, completion: 64, lessonsToPlan: 3, roster: ['Omar Khaled', 'Lina Mostafa', 'Youssef Adel', 'Mariam Sameh'] },
  { id: 'c2', nameKey: 'classes.linearAlgebra', grade: '11-B', students: 19, average: 71, completion: 52, lessonsToPlan: 2, roster: ['Karim Nabil', 'Salma Tarek', 'Adam Sherif'] },
  { id: 'c3', nameKey: 'classes.physics', grade: '10-C', students: 27, average: 66, completion: 45, lessonsToPlan: 4, roster: ['Hana Magdy', 'Ziad Fouad'] },
];

export default function TeacherClasses() {
  const { t } = useTranslation('teacher');
  const { t: tc } = useTranslation('common');
  const toast = useToast();
  const [selectedId, setSelectedId] = useState(classes[0].id);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');

  const selected = classes.find((c) => c.id === selectedId) ?? classes[0];
  const canCreate = title.trim().length > 0 && category.trim().length > 0;

  return (
    <div className="space-y-6 pb-8 page-enter">
      <PageHeader
        icon={<Users className="w-6 h-6" />}
        title={t('classPage.title')}
        subtitle={t('classPage.subtitle')}
        actions={
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen((v) => !v)} aria-expanded={createOpen}>
            {t('classPage.newClass')}
          </Button>
        }
      />
      <SectionTabs items={teacherNav} label={tc('nav.teacher')} />

      {createOpen && (
        <Card variant="elevated" padding="lg" className="animate-scale-in">
          <h2 className="h4 text-text-primary mb-4">{t('classPage.createCourse')}</h2>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!canCreate) return;
              toast({ variant: 'success', title: t('classPage.created') });
              setTitle(''); setCategory(''); setCreateOpen(false);
            }}
          >
            <Input label={t('classPage.courseTitle')} required placeholder={t('classPage.courseTitlePlaceholder')} value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input label={t('classPage.category')} required placeholder={t('classPage.category')} value={category} onChange={(e) => setCategory(e.target.value)} />
            <div className="sm:col-span-2">
              <Input label={t('classPage.courseDescription')} placeholder={t('classPage.courseDescriptionPlaceholder')} />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>{tc('actions.cancel')}</Button>
              <Button type="submit" variant="primary" disabled={!canCreate}>{t('classPage.create')}</Button>
            </div>
          </form>
        </Card>
      )}
      {classes.length === 0 ? (
        <EmptyState icon={<Users className="w-6 h-6" />} title={t('classPage.emptyTitle')} description={t('classPage.emptyDesc')} illustration="/illustrations/empty-classes.svg" />
      ) : (
        <div className="grid lg:grid-cols-5 gap-6 items-start">
          <div className="lg:col-span-2 space-y-3" role="tablist" aria-label={t('classPage.title')}>
            {classes.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={selectedId === c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-start rounded-xl border p-4 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                  selectedId === c.id
                    ? 'border-brand-border bg-brand-bg/50'
                    : 'border-surface-border bg-surface hover:border-surface-border-hover hover:bg-surface-secondary'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-text-primary truncate">{t(c.nameKey)}</h3>
                    <p className="text-caption text-text-tertiary">{c.grade} · {c.students} {t('studentsCount')}</p>
                  </div>
                  <span className="text-body-sm font-bold text-text-primary">{c.average}%</span>
                </div>
                <ProgressBar value={c.completion} variant="brand" size="sm" className="mt-3" />
              </button>
            ))}
          </div>

          <div className="lg:col-span-3 space-y-4">
            <Card variant="elevated" padding="lg">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="h3 text-text-primary">{t(selected.nameKey)}</h2>
                  <p className="text-caption text-text-tertiary mt-0.5">{selected.grade}</p>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-bg text-brand text-caption font-medium">
                  <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                  {selected.lessonsToPlan} {t('classPage.lessonsToPlan')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-5">
                <div className="rounded-lg bg-surface-secondary p-3">
                  <p className="text-caption text-text-tertiary">{t('classPage.average')}</p>
                  <p className="text-xl font-bold text-text-primary">{selected.average}%</p>
                </div>
                <div className="rounded-lg bg-surface-secondary p-3">
                  <p className="text-caption text-text-tertiary">{t('classPage.completion')}</p>
                  <p className="text-xl font-bold text-text-primary">{selected.completion}%</p>
                </div>
              </div>
            </Card>

            <Card variant="elevated" padding="lg">
              <h3 className="font-semibold text-text-primary mb-3">{t('classPage.roster')}</h3>
              <ul className="space-y-2.5">
                {selected.roster.map((name) => (
                  <li key={name} className="flex items-center gap-3">
                    <Avatar src="/avatars/student.svg" name={name} size="sm" />
                    <span className="text-body-sm text-text-primary">{name}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
