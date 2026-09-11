import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { Card } from '../../../shared/components/ui/Card';
import { ProgressBar } from '../../../shared/components/ui/ProgressBar';
import { Clock } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import { calculusQuiz } from '../../../data';
import { useAuth } from '../../../app/layout/AuthProvider';
import {
  createAdaptiveSession,
  selectNextQuestion,
  processAnswer,
} from '../../../shared/intelligence/adaptive-quiz';
import { learningSync } from '../../../shared/services/learningSync';
import type { AdaptiveQuizQuestion, AdaptiveQuizSession, Question } from '../../../shared/domain';

const CONCEPT_FOR_TOPIC: Record<string, string> = {
  Limits: 'concept-limits',
  Derivatives: 'concept-derivatives',
  Continuity: 'concept-continuity',
};

export const calculusQuestionBank: Question[] = calculusQuiz.questions.map((q, i) => {
  const difficulty =
    q.topic === 'Limits' ? (i === 0 ? 1 : 2) : q.topic === 'Continuity' ? 2 : i === 0 ? 3 : 4;
  return {
    id: q.id,
    topic: q.topic,
    type: 'math',
    difficulty,
    body: q.question,
    options: q.options,
    correctOptionIndex: q.correctAnswer,
    correctAnswer: q.options[q.correctAnswer],
    explanation: q.explanation,
    conceptId: CONCEPT_FOR_TOPIC[q.topic] ?? 'concept-general',
    skillId: (CONCEPT_FOR_TOPIC[q.topic] ?? 'concept-general').replace('concept-', 'skill-'),
  };
});

export default function QuizPage() {
  const { t } = useTranslation('assessment');
  const navigate = useNavigate();
  const params = useParams<{ assessmentId: string }>();
  const { user } = useAuth();
  const studentId = user?.id ?? 'student-local';

  const [session, setSession] = useState<AdaptiveQuizSession | null>(null);
  const [current, setCurrent] = useState<AdaptiveQuizQuestion | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [timeLeft, setTimeLeft] = useState(900);
  const [started, setStarted] = useState(false);

  // Hydrate authoritative learning state from the backend before the first session.
  useEffect(() => {
    if (!started) return;
    void (async () => {
      if (user?.id) await learningSync.hydrate(user.id);
    })();
  }, [started, user?.id]);

  const start = useCallback(() => {
    const nowIso = new Date().toISOString();
    const s = createAdaptiveSession({
      studentId,
      targetNodeId: 'concept-limits',
      maxQuestions: 12,
      advanceStreak: 2,
      maxConsecutiveWrong: 2,
      reviewMode: false,
      nowIso,
    });
    setSession(s);
    setCurrent(selectNextQuestion(s, calculusQuestionBank));
    setStarted(true);
  }, [studentId]);

  // Per-question countdown timer.
  useEffect(() => {
    if (!started || !session) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [started, session]);

  const handleSubmit = () => {
    const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    if (session) {
      learningSync.recordEvent({
        id: `ev-${studentId}-quiz-submitted-${session.id}`,
        studentId,
        kind: 'quiz-submitted',
        source: 'assessment',
        happenedAt: new Date().toISOString(),
        assessmentId: params.assessmentId ?? 'quiz-1',
        nodeId: 'concept-limits',
        nodeType: 'concept',
        payload: { score, total, correct: correctCount },
        clientKey: `quiz-submit-${session.id}`,
      } as any);
      learningSync.flush(studentId);
    }
    navigate(`/results/${params.assessmentId ?? 'quiz-1'}`, { state: { score } });
  };

  const handleSelect = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
  };

  const handleNext = () => {
    if (!current || selected === null || !session) return;
    const q = current.question;
    const chosen = q.options?.[selected] ?? String(selected);
    const idx = session.questions.length;
    const elapsed = Math.max(1, 900 - timeLeft);
    const result = processAnswer(session, current, chosen, elapsed);

    const countAfter = total + 1;
    const correctAfter = correctCount + (result.correct ? 1 : 0);
    setTotal(countAfter);
    setCorrectCount(correctAfter);
    setSelected(null);
    setTimeLeft(900);

    // Persist this question's event + mastery update to the backend (idempotent).
    learningSync.flush(studentId);

    if (result.shouldStop || countAfter >= session.config.maxQuestions) {
      handleSubmit();
      return;
    }

    const nextSession: AdaptiveQuizSession = {
      ...session,
      questions: [...session.questions, current],
      correctIndices: result.correct ? [...session.correctIndices, idx] : session.correctIndices,
      consecutiveWrong: result.correct ? 0 : session.consecutiveWrong + 1,
      currentState: result.newState,
      currentDifficulty: result.nextDifficulty,
    };
    setSession(nextSession);
    setCurrent(selectNextQuestion(nextSession, calculusQuestionBank));
  };

  if (!session || !current || !started) {
    return (
      <div className="min-h-screen bg-surface py-6 page-enter">
        <div className="max-w-2xl mx-auto px-4">
          <Card variant="elevated" padding="lg" className="text-center">
            <h1 className="display-sm text-text-primary mb-2">
              {t('adaptiveQuizTitle', { default: 'Adaptive Quiz' })}
            </h1>
            <p className="body text-text-secondary mb-6">
              {t('adaptiveQuizDesc', {
                default: 'Questions adapt to your mastery. Each answer updates your knowledge and selects the next best question.',
              })}
            </p>
            <Button variant="primary" onClick={start}>{t('startQuiz')}</Button>
          </Card>
        </div>
      </div>
    );
  }

  const q = current.question;
  const pct = (total / (session?.config.maxQuestions ?? 12)) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  void q;

  return (
    <div className="min-h-screen bg-surface py-6 page-enter">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-border">
          <div className="flex items-center gap-4 flex-wrap">
            <Badge variant="outline" size="md">
              <Clock className="w-4 h-4 me-1" />
              {t('timeLeft')}: {minutes}:{seconds.toString().padStart(2, '0')}
            </Badge>
            <Badge variant="outline" size="sm">
              {t('question')} {total + 1} {t('of')} {session.config.maxQuestions}
            </Badge>
            <Badge variant={resultBadge(correctCount, total)} size="sm">
              {correctCount}/{total}
            </Badge>
            {current.state ? <Badge variant="info" size="sm">{current.state}</Badge> : null}
          </div>
        </div>

        <ProgressBar value={pct} variant="brand" size="md" className="mb-6" />

        <Card variant="elevated" padding="lg" className="mb-8">
          <h2 className="h3 text-text-primary leading-relaxed">{q.body}</h2>
          <div className="space-y-3 mt-6">
            {(q.options ?? []).map((option, index) => (
              <label
                key={index}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all group',
                  selected === index
                    ? 'border-brand bg-brand-bg shadow-sm'
                    : 'border-surface-border hover:border-surface-border-hover hover:bg-surface-secondary/50',
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold transition-all',
                    selected === index ? 'bg-brand text-white' : 'bg-surface-secondary text-text-tertiary',
                  )}
                >
                  {String.fromCharCode(65 + index)}
                </div>
                <span className="text-body text-text-primary flex-1">{option}</span>
                <input
                  type="radio"
                  name="quiz-answer"
                  checked={selected === index}
                  onChange={() => handleSelect(index)}
                  className="sr-only"
                />
              </label>
            ))}
          </div>
          {selected !== null && <div className="mt-4 body text-text-tertiary">{q.explanation}</div>}
        </Card>

        <div className="flex justify-between">
          <Button variant="secondary" disabled>{t('previous')}</Button>
          {selected === null ? (
            <Button variant="primary" disabled>{t('selectAnswer')}</Button>
          ) : total + 1 >= session.config.maxQuestions ? (
            <Button variant="error" onClick={handleSubmit}>{t('submit')}</Button>
          ) : (
            <Button variant="primary" onClick={handleNext}>{t('next')}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function resultBadge(correct: number, total: number): 'success' | 'warning' | 'error' {
  if (total === 0) return 'warning';
  const pct = (correct / total) * 100;
  return pct >= 70 ? 'success' : pct >= 40 ? 'warning' : 'error';
}
