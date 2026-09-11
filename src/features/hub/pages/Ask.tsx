import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { aiStudio } from '../../../shared/services/ai-studio';
import { getMockUser } from '../../../shared/lib/mockAuth';
import { Search, BookOpen, Loader2 } from 'lucide-react';

function sid(): string { return getMockUser()?.id ?? 'student-001'; }

export default function AskPage() {
  const { t } = useTranslation('hub');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<{ answer: string; courseTitle: string; concepts: string; sources: string[]; related: string[] } | null>(null);

  const ask = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const r = await aiStudio.askCourse(sid(), 'calculus-1', q, 'l3');
      setRes(r);
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 pb-10 page-enter max-w-3xl mx-auto">
      <div>
        <h1 className="display-sm text-text-primary">{t('askTitle')}</h1>
        <p className="body text-text-secondary mt-1">{t('askSub')}</p>
      </div>
      <Card variant="elevated" padding="md">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()}
              placeholder={t('askPlaceholder')} aria-label={t('askTitle')}
              className="w-full ps-9 pe-3 h-11 rounded-xl border border-surface-border bg-surface text-text-primary" />
          </div>
          <Button variant="ai" size="md" onClick={ask} disabled={loading || !q.trim()}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{t('askBtn')}</Button>
        </div>
      </Card>
      {res ? (
        <Card variant="elevated" padding="md">
          <p className="text-sm text-text-secondary leading-relaxed">{res.answer}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {res.sources.map((s) => <Badge key={s} variant="primary" size="xs"><BookOpen className="w-3 h-3 me-1" />{s}</Badge>)}
            {res.related.map((r) => <Badge key={r} variant="default" size="xs">{r}</Badge>)}
          </div>
          <p className="text-xs text-text-tertiary mt-2">{t('concepts')}: {res.concepts}</p>
        </Card>
      ) : (
        <EmptyState icon={<Search />} title={t('askEmpty')} description={t('askEmptyDesc')} className="py-10" />
      )}
    </div>
  );
}

