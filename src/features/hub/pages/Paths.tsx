import { useTranslation } from 'react-i18next';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { learningEngine } from '../../../shared/services/learning-engine';
import { knowledgeGraph } from '../../../shared/services/knowledge-graph';
import { getMockUser } from '../../../shared/lib/mockAuth';
import { Network } from 'lucide-react';

function sid(): string { return getMockUser()?.id ?? 'student-001'; }

export default function PathsPage() {
  const { t } = useTranslation('hub');
  const path = learningEngine.dynamicPath(sid(), 'course-calculus-1');
  const graph = knowledgeGraph.get();
  const label = (id: string) => graph.nodes.find((n) => n.id === id)?.label ?? id;
  return (
    <div className="space-y-6 pb-10 page-enter max-w-4xl mx-auto">
      <h1 className="display-sm text-text-primary">{t('pathsTitle')}</h1>
      <p className="body text-text-secondary">{t('pathsSub')}</p>
      <div className="grid md:grid-cols-3 gap-4">
        <Card variant="elevated" padding="md">
          <h3 className="font-semibold text-success mb-2">{t('mastered', { n: path.mastered.length })}</h3>
          {path.mastered.map((m) => <Badge key={m} variant="success" size="xs" className="me-1 mb-1">{label(m)}</Badge>)}
          {path.mastered.length === 0 && <p className="text-sm text-text-tertiary">{t('noneYet')}</p>}
        </Card>
        <Card variant="elevated" padding="md">
          <h3 className="font-semibold text-warning mb-2">{t('weakN', { n: path.weak.length })}</h3>
          {path.remediation.map((m) => <Badge key={m} variant="warning" size="xs" className="me-1 mb-1">{label(m)}</Badge>)}
          {path.weak.length === 0 && <p className="text-sm text-text-tertiary">{t('noneYet')}</p>}
        </Card>
        <Card variant="elevated" padding="md">
          <h3 className="font-semibold text-brand mb-2">{t('upNext')}</h3>
          <ol className="list-decimal ms-5 text-sm text-text-secondary space-y-1">
            {path.next.map((m) => <li key={m}>{label(m)}</li>)}
          </ol>
          {path.next.length === 0 && <EmptyState compact icon={<Network />} title={t('pathEmpty')} description={t('pathEmptyDesc')} />}
        </Card>
      </div>
    </div>
  );
}
