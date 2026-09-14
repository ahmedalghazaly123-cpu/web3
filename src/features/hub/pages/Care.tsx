import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { useAuth } from '../../../app/layout/AuthProvider';
import { learningSync } from '../../../shared/services/learningSync';
import { trust } from '../../../shared/services/trust';
import { store } from '../../../shared/services/store';
import { ShieldCheck, Award } from 'lucide-react';

export default function CarePage() {
  const { t } = useTranslation('hub');
  const { user } = useAuth();
  const studentId = user?.id ?? 'student-local';
  const [count, setCount] = useState(() => store.certificates.list().length);

  useEffect(() => { if (user?.id) void learningSync.hydrate(user.id); }, [user?.id]);

  const risk = trust.risk(studentId);
  return (
    <div className="space-y-6 pb-10 page-enter max-w-3xl mx-auto">
      <h1 className="display-sm text-text-primary">{t('careTitle')}</h1>
      <p className="body text-text-secondary">{t('careSub')}</p>
      <Card variant="elevated" padding="md">
        <div className="flex items-center gap-2 mb-2"><ShieldCheck className="w-4 h-4 text-brand" /><h3 className="font-semibold text-text-primary">{t('riskTitle')}</h3></div>
        <Badge variant={risk.level === 'ok' ? 'success' : risk.level === 'needs-attention' ? 'warning' : 'error'} size="sm">{t(`risk.${risk.level}`)} · {risk.score}</Badge>
        <ul className="list-disc ms-5 mt-2 text-sm text-text-secondary">{risk.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        <ul className="list-disc ms-5 mt-1 text-sm text-text-secondary">{risk.actions.map((a) => <li key={a}>{a}</li>)}</ul>
      </Card>
      <Card variant="elevated" padding="md">
        <div className="flex items-center gap-2 mb-2"><Award className="w-4 h-4 text-warning" /><h3 className="font-semibold text-text-primary">{t('certTitle')}</h3></div>
        <Button variant="secondary" size="sm" onClick={() => { trust.issueCertificate(studentId, user?.name ?? 'Student', 'calculus-1', 'Calculus I', 85); setCount(store.certificates.list().length); }}>{t('issueDemo')}</Button>
        {count > 0 && <p className="text-sm text-text-secondary mt-2">{count} certificate(s) stored locally with verification codes.</p>}
      </Card>
    </div>
  );
}
