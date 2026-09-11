import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { productivity } from '../../../shared/services/productivity';
import { getMockUser } from '../../../shared/lib/mockAuth';
import { Timer, MessagesSquare } from 'lucide-react';

function sid(): string { return getMockUser()?.id ?? 'student-001'; }

export default function FocusPage() {
  const { t } = useTranslation('hub');
  const [mins, setMins] = useState(25);
  const [done, setDone] = useState(0);
  return (
    <div className="space-y-6 pb-10 page-enter max-w-3xl mx-auto">
      <h1 className="display-sm text-text-primary">{t('focusTitle')}</h1>
      <p className="body text-text-secondary">{t('focusSub')}</p>
      <Card variant="elevated" padding="md">
        <div className="flex items-center gap-2 mb-3"><Timer className="w-4 h-4 text-brand" /><h3 className="font-semibold text-text-primary">{t('pomodoro')}</h3></div>
        <div className="flex items-center gap-3 flex-wrap">
          <input type="range" min={5} max={60} step={5} value={mins} onChange={(e) => setMins(Number(e.target.value))} aria-label={t('focusTitle')} />
          <Badge variant="info" size="sm">{mins} min</Badge>
          <Button variant="primary" size="sm" onClick={() => {
            productivity.focusSession(sid(), mins, 'Deep study');
            productivity.bumpStreak(sid());
            productivity.logAttention(sid(), { sessionMinutes: mins, mistakes: 0, rapidGuesses: 0 });
            setDone((d) => d + 1);
          }}>{t('startFocus')}</Button>
        </div>
        {done > 0 && <p className="text-sm text-success mt-2">{t('sessionsDone', { n: done })}</p>}
      </Card>
      <Card variant="outlined" padding="md">
        <div className="flex items-center gap-2"><MessagesSquare className="w-4 h-4 text-ai" /><h3 className="font-semibold text-text-primary">{t('studyPartner')}</h3></div>
        <p className="text-sm text-text-secondary mt-1">{t('studyPartnerDesc')}</p>
      </Card>
    </div>
  );
}
