import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Search } from 'lucide-react';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { Badge } from '../../../shared/components/ui/Badge';
import { Avatar } from '../../../shared/components/ui/Avatar';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { ProgressBar } from '../../../shared/components/ui/ProgressBar';
import { SectionTabs } from '../../../shared/components/layout/SectionTabs';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { teacherNav } from '../../../shared/components/layout/navGroups';

interface StudentRow {
  id: string; name: string; classKey: string; avg: number; participation: number;
  status: 'onTrack' | 'atRisk' | 'excelling';
}

const students: StudentRow[] = [
  { id: 's1', name: 'Omar Khaled', classKey: 'classes.calculus', avg: 88, participation: 92, status: 'excelling' },
  { id: 's2', name: 'Lina Mostafa', classKey: 'classes.linearAlgebra', avg: 91, participation: 88, status: 'excelling' },
  { id: 's3', name: 'Youssef Adel', classKey: 'classes.calculus', avg: 54, participation: 47, status: 'atRisk' },
  { id: 's4', name: 'Mariam Sameh', classKey: 'classes.physics', avg: 72, participation: 70, status: 'onTrack' },
  { id: 's5', name: 'Karim Nabil', classKey: 'classes.linearAlgebra', avg: 69, participation: 74, status: 'onTrack' },
  { id: 's6', name: 'Salma Tarek', classKey: 'classes.physics', avg: 49, participation: 40, status: 'atRisk' },
  { id: 's7', name: 'Hana Magdy', classKey: 'classes.physics', avg: 84, participation: 90, status: 'excelling' },
  { id: 's8', name: 'Adam Sherif', classKey: 'classes.linearAlgebra', avg: 76, participation: 81, status: 'onTrack' },
];

export default function TeacherStudents() {
  const { t } = useTranslation('teacher');
  const { t: tc } = useTranslation('common');
  const [query, setQuery] = useState('');

  const visible = students.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="space-y-6 pb-8 page-enter">
      <PageHeader
        icon={<GraduationCap className="w-6 h-6" />}
        title={t('studentPage.title')}
        subtitle={t('studentPage.subtitle')}
        actions={
          <div className="w-56">
            <Input
              size="sm"
              aria-label={t('studentPage.searchPlaceholder')}
              placeholder={t('studentPage.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" aria-hidden="true" />}
            />
          </div>
        }
      />
      <SectionTabs items={teacherNav} label={tc('nav.teacher')} />

      {visible.length === 0 ? (
        <EmptyState icon={<GraduationCap className="w-6 h-6" />} title={t('studentPage.emptyTitle')} description={t('studentPage.emptyDesc')} illustration="/illustrations/empty-classes.svg" />
      ) : (
        <Card variant="elevated" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-secondary border-b border-surface-border">
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('studentPage.student')}</th>
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('studentPage.classLabel')}</th>
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('studentPage.avgScore')}</th>
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('studentPage.participation')}</th>
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('studentPage.status')}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <tr key={s.id} className="border-b border-surface-border last:border-0 hover:bg-surface-secondary/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar src="/avatars/student.svg" name={s.name} size="sm" />
                        <span className="font-medium text-text-primary">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-body-sm text-text-secondary">{t(s.classKey)}</td>
                    <td className="px-4 py-3.5 w-40">
                      <div className="flex items-center gap-2">
                        <span className="text-body-sm font-semibold text-text-primary w-9">{s.avg}%</span>
                        <ProgressBar value={s.avg} size="sm" variant={s.avg >= 80 ? 'success' : s.avg >= 60 ? 'brand' : 'warning'} />
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-body-sm text-text-secondary">{s.participation}%</td>
                    <td className="px-4 py-3.5">
                      <Badge variant={s.status === 'excelling' ? 'success' : s.status === 'atRisk' ? 'error' : 'info'} dot>
                        {t(`studentPage.${s.status}`)}
                      </Badge>
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
