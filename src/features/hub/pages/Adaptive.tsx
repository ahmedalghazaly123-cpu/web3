import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { ProgressBar } from '../../../shared/components/ui/ProgressBar';
import { useAuth } from '../../../app/layout/AuthProvider';
import { learningSync } from '../../../shared/services/learningSync';
import { learningEngine } from '../../../shared/services/learning-engine';
import { productivity } from '../../../shared/services/productivity';
import { CheckCircle, XCircle, BrainCircuit } from 'lucide-react';

export default function AdaptivePage() {
  const { t } = useTranslation('hub');
  const { user } = useAuth();
  const studentId = user?.id ?? 'student-local';
  const [topic, setTopic] = useState<string>('');
  const [q, setQ] = useState(() => learningEngine.nextQuestion(studentId, 'course-calculus-1', undefined));
  const [choice, setChoice] = useState<number | null>(null);
  const [result, setResult] = useState<{ correct: boolean; nextDifficulty: number } | null>(null);
  const [streak, setStreak] = useState(0);
  useEffect(() => { if (user?.id) void learningSync.hydrate(user.id); }, [user?.id]);

  const topics = useMemo(() => [...new Set(learningEngine.questionBank().map((x) => x.topic))], []);

  const submit = () => {
    if (choice === null) return;
    const r = learningEngine.answer(studentId, 'course-calculus-1', 'course', q, choice, 12);
    setResult(r);
    if (r.correct) {
      setStreak((s) => s + 1);
      productivity.awardXp(studentId, 10 * q.difficulty, 'adaptive-correct');
      learningEngine.scheduleReview(studentId, 'course-calculus-1', 4);
    } else setStreak(0);
  };

  const next = () => {
    setQ(learningEngine.nextQuestion(studentId, 'course-calculus-1', topic || undefined));
    setChoice(null);
    setResult(null);
  };

  return (
    <div className="space-y-6 pb-10 page-enter max-w-3xl mx-auto">
      <div>
        <h1 className="display-sm text-text-primary">{t('adaptiveTitle')}</h1>
        <p className="body text-text-secondary mt-1">{t('adaptiveSub')}</p>
      </div>

      <Card variant="elevated" padding="md">
        <div className="flex flex-wrap gap-2 mb-4">
          <Button variant={topic === '' ? 'primary' : 'secondary'} size="sm" onClick={() => setTopic('')}>{t('allTopics')}</Button>
          {topics.map((tp) => (
            <Button key={tp} variant={topic === tp ? 'primary' : 'secondary'} size="sm" onClick={() => setTopic(tp)}>{tp}</Button>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="info" size="xs">{t('difficulty', { n: q.difficulty })}</Badge>
          <Badge variant="default" size="xs">{q.topic}</Badge>
          <Badge variant="success" size="xs">{t('streak', { n: streak })}</Badge>
        </div>
        <h2 className="h3 text-text-primary mb-4">{q.body}</h2>
        <div className="space-y-2">
          {learningEngine.choicesOf(q).map((c, i) => (
            <button key={i} onClick={() => setChoice(i)} aria-pressed={choice === i}
              className={`w-full text-start p-3 rounded-xl border-2 transition-all ${choice === i ? 'border-brand bg-brand-bg' : 'border-surface-border hover:border-surface-border-hover'}`}>
              <span className="font-medium text-text-primary">{String.fromCharCode(65 + i)}. {c}</span>
            </button>
          ))}
        </div>
        {result && (
          <div className={`mt-4 p-3 rounded-xl flex gap-2 items-start ${result.correct ? 'bg-success-bg text-success' : 'bg-error-bg text-error'}`}>
            {result.correct ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <div>
              <p className="font-semibold">{result.correct ? t('correct') : t('wrong')}</p>
              <p className="text-sm opacity-90">{q.explanation}</p>
              <p className="text-xs mt-1">{t('nextUp', { n: result.nextDifficulty })}</p>
            </div>
          </div>
        )}
        <div className="flex gap-2 mt-4">
          {!result ? <Button variant="primary" size="md" onClick={submit} disabled={choice === null}>{t('submit')}</Button>
            : <Button variant="primary" size="md" onClick={next}>{t('nextQ')}</Button>}
        </div>
      </Card>

      <MistakePanel />
    </div>
  );
}

function MistakePanel() {
  const { t } = useTranslation('hub');
  return (
    <Card variant="outlined" padding="md">
      <div className="flex items-center gap-2 mb-2">
        <BrainCircuit className="w-4 h-4 text-ai" />
        <h3 className="font-semibold text-text-primary">{t('mistakeNotebook')}</h3>
      </div>
      <p className="text-sm text-text-secondary">{t('mistakeDesc')}</p>
      <ProgressBar value={40} variant="warning" size="sm" className="mt-3" />
      <EmptyState compact icon={<BrainCircuit />} title={t('mistakesTracked')} description={t('mistakesTrackedDesc')} className="py-6" />
    </Card>
  );
}
