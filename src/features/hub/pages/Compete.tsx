import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { collab } from '../../../shared/services/collab';
import { getMockUser } from '../../../shared/lib/mockAuth';
import { Trophy, Users } from 'lucide-react';

function sid(): string { return getMockUser()?.id ?? 'student-001'; }

export default function CompetePage() {
  const { t } = useTranslation('hub');
  const [log, setLog] = useState<string[]>([]);
  return (
    <div className="space-y-6 pb-10 page-enter max-w-3xl mx-auto">
      <h1 className="display-sm text-text-primary">{t('competeTitle')}</h1>
      <p className="body text-text-secondary">{t('competeSub')}</p>
      <Card variant="elevated" padding="md">
        <div className="flex items-center gap-2 mb-3"><Trophy className="w-4 h-4 text-warning" /><h3 className="font-semibold text-text-primary">{t('rooms')}</h3></div>
        <div className="flex flex-wrap gap-2">
          {(['study', 'quiz-battle', 'code-battle'] as const).map((kind) => (
            <Button key={kind} variant="secondary" size="sm" onClick={() => {
              const room = collab.createRoom(sid(), kind, `${kind} room`, 'course-calculus-1');
              collab.join(room.id, sid(), 'You');
              collab.start(room.id);
              collab.award(room.id, sid(), 10);
              const done = collab.finish(room.id);
              const code = done?.code ?? (room.settings as { code?: string } | undefined)?.code ?? '';
              setLog((l) => [...l, `${t(`roomKind.${kind}`)} ${code}: ${t('winner')}: ${done?.winner ? 'You (10 pts)' : t('noWinner')}`]);
            }}>{t(`roomKind.${kind}`)}</Button>
          ))}
        </div>
        {log.length > 0 && <ul className="mt-3 text-sm text-text-secondary space-y-1">{log.map((m, i) => <li key={i}>• {m}</li>)}</ul>}
      </Card>
      <Card variant="outlined" padding="md">
        <div className="flex items-center gap-2"><Users className="w-4 h-4 text-brand" /><h3 className="font-semibold text-text-primary">{t('fairPlay')}</h3></div>
        <p className="text-sm text-text-secondary mt-1">{t('fairPlayDesc')}</p>
      </Card>
    </div>
  );
}
