import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Check, X, FileText } from 'lucide-react';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { IconBox } from '../../../shared/components/ui/IconBox';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { useToast } from '../../../shared/components/ui/ToastProvider';
import { SectionTabs } from '../../../shared/components/layout/SectionTabs';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { adminNav } from '../../../shared/components/layout/navGroups';

interface ContentItem { id: string; title: string; author: string; lessons: number; students: number; status: 'draft' | 'underReview' | 'publish'; }

const initial: ContentItem[] = [
  { id: 'c1', title: 'Introduction to Trigonometry', author: 'Nadia Fathy', lessons: 8, students: 0, status: 'underReview' },
  { id: 'c2', title: 'Organic Chemistry Basics', author: 'Mariam Sameh', lessons: 12, students: 0, status: 'underReview' },
  { id: 'c3', title: 'World History: Modern Era', author: 'Karim Nabil', lessons: 6, students: 0, status: 'draft' },
  { id: 'c4', title: 'Python for Beginners', author: 'Hassan Ali', lessons: 15, students: 312, status: 'publish' },
];

export default function AdminContent() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const toast = useToast();
  const [items, setItems] = useState(initial);

  const review = (id: string, approve: boolean) => {
    setItems((list) => list.filter((i) => i.id !== id));
    toast({
      variant: approve ? 'success' : 'warning',
      title: approve ? t('contentPage.approved') : t('contentPage.rejected'),
    });
  };

  const pending = items.filter((i) => i.status === 'underReview');

  return (
    <div className="space-y-6 pb-8 page-enter">
      <PageHeader icon={<BookOpen className="w-6 h-6" />} title={t('contentPage.title')} subtitle={t('contentPage.subtitle')} />
      <SectionTabs items={adminNav} label={tc('nav.admin')} />

      {items.length === 0 ? (
        <EmptyState icon={<BookOpen className="w-6 h-6" />} title={t('contentPage.emptyTitle')} description={t('contentPage.emptyDesc')} />
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <p className="text-body-sm text-text-secondary">
              {pending.length} × <Badge variant="warning" size="xs">{t('contentPage.underReview')}</Badge>
            </p>
          )}
          {items.map((c) => (
            <Card key={c.id} variant="elevated" padding="md" className="card-lift">
              <div className="flex flex-wrap items-center gap-4">
                <IconBox tone={c.status === 'publish' ? 'success' : c.status === 'underReview' ? 'warning' : 'neutral'} size="lg">
                  <FileText />
                </IconBox>
                <div className="flex-1 min-w-[180px]">
                  <h3 className="font-medium text-text-primary">{c.title}</h3>
                  <p className="text-caption text-text-tertiary mt-0.5">
                    {t('contentPage.createdBy')} {c.author} · {c.lessons} {t('contentPage.lessons')}
                    {c.students > 0 && <> · {c.students} {t('contentPage.students')}</>}
                  </p>
                </div>
                <Badge variant={c.status === 'publish' ? 'success' : c.status === 'underReview' ? 'warning' : 'default'} dot>
                  {t(`contentPage.${c.status}`)}
                </Badge>
                {c.status === 'underReview' && (
                  <div className="flex items-center gap-2">
                    <Button variant="primary" size="sm" leftIcon={<Check className="w-4 h-4" />} onClick={() => review(c.id, true)}>{t('contentPage.approve')}</Button>
                    <Button variant="ghost" size="sm" leftIcon={<X className="w-4 h-4" />} onClick={() => review(c.id, false)} className="text-error hover:bg-error-bg">{t('contentPage.reject')}</Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
