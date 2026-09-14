import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { Card } from '../../../shared/components/ui/Card';
import { ProgressBar } from '../../../shared/components/ui/ProgressBar';
import { Clock, Flag, AlertTriangle } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import { calculusQuestionBank } from '../pages/Quiz';
import { useAuth } from '../../../app/layout/AuthProvider';
import { learningSync } from '../../../shared/services/learningSync';
import { masteryEngine } from '../../../shared/services/mastery';
import type { Question } from '../../../shared/domain';

const CONCEPT_FOR_TOPIC: Record<string, string> = {
  Limits: 'concept-limits',
  Derivatives: 'concept-derivatives',
  Continuity: 'concept-continuity',
};

export default function ExamPage() {
  const { t } = useTranslation('assessment');
  const navigate = useNavigate();
  const params = useParams<{ assessmentId: string }>();
  const { user } = useAuth();
  const studentId = user?.id ?? 'student-local';

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(3600);
  const [submitted, setSubmitted] = useState(false);

  const bank: Question[] = calculusQuestionBank;
  const total = bank.length;
  const progress = ((currentQuestion + 1) / total) * 100;

  useEffect(() => {
    if (user?.id) void learningSync.hydrate(user.id);
  }, [user?.id]);

  useEffect(() => {
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
  }, []);

  const recordAnswer = async (index: number, choice: number) => {
    const q = bank[index];
    const concept = CONCEPT_FOR_TOPIC[q.topic] ?? 'concept-general';
    const chosen = q.options?.[choice] ?? String(choice);
    const correct = chosen === q.correctAnswer;
    await learningSync.recordEvent({
      id: `ev-${studentId}-exam-${index}`,
      studentId,
      kind: 'question-answered',
      source: 'assessment',
      happenedAt: new Date().toISOString(),
      nodeId: concept,
      nodeType: 'concept',
      questionId: q.id,
      payload: { selectedAnswer: chosen, correct, timeSpentSeconds: 120, mode: 'exam' },
      clientKey: `exam-${studentId}-${q.id}`,
    } as any);
    // Project evidence through the mastery engine (real pipeline).
    const nodeType = (q.conceptId ? 'concept' : 'skill') as 'concept' | 'skill';
    masteryEngine.recordQuizResult(studentId, concept, nodeType, correct ? 100 : 0, 120, q.difficulty);
    await learningSync.flush(studentId);
  };

  const handleSubmit = async () => {
    if (submitted) return;
    setSubmitted(true);
    const correct = bank.reduce((acc, q, i) => {
      const chosen = q.options?.[selectedAnswers[i] ?? -1] ?? '';
      return acc + (chosen === q.correctAnswer ? 1 : 0);
    }, 0);
    const totalQ = bank.length;
    const score = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;

    await learningSync.recordEvent({
      id: `ev-${studentId}-exam-submitted`,
      studentId,
      kind: 'exam-submitted',
      source: 'assessment',
      happenedAt: new Date().toISOString(),
      nodeId: 'concept-limits',
      nodeType: 'concept',
      payload: { score, total: totalQ, correct },
      clientKey: `exam-submit-${studentId}`,
    } as any);
    await learningSync.flush(studentId);
    await learningSync.saveExamResult({
      assessmentId: params.assessmentId ?? 'calculus-1',
      startedAt: new Date().toISOString(),
      submitted: true,
      totalQuestions: totalQ,
      correct,
      score,
    });

    navigate(`/results/calculus-1`, { state: { score } });
  };

  const handleSelect = async (index: number) => {
    setSelectedAnswers({ ...selectedAnswers, [currentQuestion]: index });
    await recordAnswer(currentQuestion, index);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isLowTime = timeLeft < 300;

  const question = bank[currentQuestion];

  return (
    <div className="min-h-screen bg-surface py-6 page-enter">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-border">
          <div className="flex items-center gap-4">
            <Badge variant={isLowTime ? 'error' : 'outline'} size="md" className={isLowTime ? 'animate-pulse' : ''}>
              <Clock className="w-4 h-4 me-1" />
              {t('timeLeft')}: {minutes}:{seconds.toString().padStart(2, '0')}
            </Badge>
            <Badge variant="outline" size="sm">
              {t('question')} {currentQuestion + 1} {t('of')} {total}
            </Badge>
          </div>
          <button
            onClick={() => {
              const m = new Set(markedForReview);
              m.has(currentQuestion) ? m.delete(currentQuestion) : m.add(currentQuestion);
              setMarkedForReview(m);
            }}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors',
              markedForReview.has(currentQuestion)
                ? 'bg-warning-bg text-warning'
                : 'text-text-secondary hover:bg-surface-secondary',
            )}
          >
            <Flag className="w-4 h-4" />
            {t('markForReview')}
          </button>
        </div>

        <ProgressBar value={progress} variant={isLowTime ? 'error' : 'brand'} size="md" className="mb-6" />

        <Card variant="elevated" padding="lg" className="mb-8">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <h2 className="h3 text-text-primary leading-relaxed">{question.body}</h2>
          </div>
          <div className="space-y-3 mt-6">
            {(question.options ?? []).map((option, index) => (
              <label
                key={index}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all group',
                  selectedAnswers[currentQuestion] === index
                    ? 'border-brand bg-brand-bg shadow-sm'
                    : 'border-surface-border hover:border-surface-border-hover hover:bg-surface-secondary/50',
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold transition-all',
                    selectedAnswers[currentQuestion] === index
                      ? 'bg-brand text-white'
                      : 'bg-surface-secondary text-text-tertiary group-hover:bg-surface-tertiary',
                  )}
                >
                  {String.fromCharCode(65 + index)}
                </div>
                <span className="text-body text-text-primary flex-1">{option}</span>
                <input
                  type="radio"
                  name="exam-answer"
                  checked={selectedAnswers[currentQuestion] === index}
                  onChange={() => handleSelect(index)}
                  className="sr-only"
                />
              </label>
            ))}
          </div>
        </Card>

        <div className="flex justify-between">
          <Button
            variant="secondary"
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
          >
            {t('previous')}
          </Button>
          {currentQuestion < total - 1 ? (
            <Button variant="primary" onClick={() => setCurrentQuestion(Math.min(total - 1, currentQuestion + 1))}>
              {t('next')}
            </Button>
          ) : (
            <Button variant="error" onClick={handleSubmit}>
              {t('submit')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
