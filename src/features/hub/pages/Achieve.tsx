import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { useAuth } from '../../../app/layout/AuthProvider';
import { learningSync } from '../../../shared/services/learningSync';
import { engagementEngine } from '../../../shared/intelligence/engagement';
import { store } from '../../../shared/services/store';
import { Award, Bookmark } from 'lucide-react';

export default function AchievePage() {
  const { t } = useTranslation('hub');
  const { user } = useAuth();
  const studentId = user?.id ?? 'student-local';

  useEffect(() => { if (user?.id) void learningSync.hydrate(user.id); }, [user?.id]);
  return (
    <div className="space-y-6 pb-10 page-enter max-w-3xl mx-auto">
      <h1 className="display-sm text-text-primary">{t('achieveTitle')}</h1>
      <p className="body text-text-secondary">{t('achieveSub')}</p>
      <Card variant="elevated" padding="md">
        <div className="flex items-center gap-2 mb-2"><Award className="w-4 h-4 text-warning" /><h3 className="font-semibold text-text-primary">{t('gamification')}</h3></div>
        <Button variant="secondary" size="sm" onClick={() => engagementEngine.awardMeaningfulXp(studentId, 'correct', new Date().toISOString())}>{t('earnXp')}</Button>
      </Card>
      <Card variant="elevated" padding="md">
        <div className="flex items-center gap-2 mb-2"><Bookmark className="w-4 h-4 text-brand" /><h3 className="font-semibold text-text-primary">{t('bookmarks')}</h3></div>
        <Button variant="secondary" size="sm" onClick={() => {
          store.bookmarks.save({
            id: store.uid(),
            studentId,
            targetType: 'lesson',
            targetId: 'l3',
            excerpt: 'Chain rule',
            createdAt: new Date().toISOString(),
          });
        }}>{t('addBookmark')}</Button>
      </Card>
    </div>
  );
}