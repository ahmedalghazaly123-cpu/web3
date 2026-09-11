import { useTranslation } from 'react-i18next';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { productivity } from '../../../shared/services/productivity';
import { getMockUser } from '../../../shared/lib/mockAuth';
import { Award, Bookmark } from 'lucide-react';

function sid(): string { return getMockUser()?.id ?? 'student-001'; }

export default function AchievePage() {
  const { t } = useTranslation('hub');
  return (
    <div className="space-y-6 pb-10 page-enter max-w-3xl mx-auto">
      <h1 className="display-sm text-text-primary">{t('achieveTitle')}</h1>
      <p className="body text-text-secondary">{t('achieveSub')}</p>
      <Card variant="elevated" padding="md">
        <div className="flex items-center gap-2 mb-2"><Award className="w-4 h-4 text-warning" /><h3 className="font-semibold text-text-primary">{t('gamification')}</h3></div>
        <Button variant="secondary" size="sm" onClick={() => productivity.awardXp(sid(), 25, 'demo')}>{t('earnXp')}</Button>
      </Card>
      <Card variant="elevated" padding="md">
        <div className="flex items-center gap-2 mb-2"><Bookmark className="w-4 h-4 text-brand" /><h3 className="font-semibold text-text-primary">{t('bookmarks')}</h3></div>
        <Button variant="secondary" size="sm" onClick={() => productivity.bookmark(sid(), 'lesson', 'l3', 'Chain rule')}>{t('addBookmark')}</Button>
      </Card>
    </div>
  );
}
