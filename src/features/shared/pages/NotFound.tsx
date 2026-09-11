import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass } from 'lucide-react';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { Button } from '../../../shared/components/ui/Button';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-surface-secondary hero-glow overflow-hidden flex items-center justify-center">
      <div className="text-center">
        <EmptyState
          icon={<Compass />}
          tone="brand"
          title={t('notFound.title')}
          description={t('notFound.description')}
          illustration="/illustrations/welcome-learning.svg"
          illustrationAlt="Lost in space illustration"
          className="!py-0"
          action={
            <Link to="/">
              <Button variant="primary" size="md" rightIcon={<Compass className="w-4 h-4" />}>{t('notFound.backHome')}</Button>
            </Link>
          }
        />
      </div>
    </div>
  );
}
