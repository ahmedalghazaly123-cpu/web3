import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BrainCircuit, Flame, ListChecks, RefreshCw, Check, X,
  Star, Moon, BookCheck, Target, Trophy, Lock, Sparkles,
} from 'lucide-react';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { IconBox } from '../../../shared/components/ui/IconBox';
import { useToast } from '../../../shared/components/ui/ToastProvider';
import { cn } from '../../../shared/lib/utils';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   AI Lesson Summary / Notes block
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function AiLessonSummary() {
  const { t } = useTranslation('dashboard');
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const points = t('aiTools.points', { returnObjects: true }) as string[];

  const regenerate = () => {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      toast({
        variant: 'success',
        title: t('aiTools.regenerated'),
        description: t('aiTools.regeneratedDesc'),
      });
    }, 1200);
  };

  return (
    <Card variant="elevated" padding="lg" glow="ai" className="flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <IconBox tone="ai" size="md"><BrainCircuit /></IconBox>
        <div className="min-w-0">
          <h3 className="font-semibold text-text-primary">{t('aiTools.summaryTitle')}</h3>
          <p className="text-caption text-text-tertiary">{t('aiTools.summaryOf')}</p>
        </div>
      </div>

      <ul className="space-y-2.5 flex-1" aria-busy={loading}>
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface-secondary border border-surface-border">
            <Sparkles className="w-3.5 h-3.5 text-ai mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p className="text-body-sm text-text-secondary leading-relaxed">{point}</p>
          </li>
        ))}
      </ul>

      <Button
        variant="ai"
        size="sm"
        className="mt-4"
        fullWidth
        isLoading={loading}
        leftIcon={!loading ? <RefreshCw className="w-4 h-4" /> : undefined}
        onClick={regenerate}
      >
        {loading ? t('aiTools.generating') : t('aiTools.regenerate')}
      </Button>
    </Card>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Quick AI Quiz generator widget
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
type Subject = 'limits' | 'derivatives' | 'matrices';

interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
}

export function QuickQuizWidget() {
  const { t } = useTranslation('dashboard');
  const toast = useToast();
  const [subject, setSubject] = useState<Subject>('limits');
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);

  const subjects = t('quizWidget.subjects', { returnObjects: true }) as Record<Subject, string>;
  const difficulties = t('quizWidget.difficulties', { returnObjects: true }) as Record<string, string>;

  const generate = () => {
    setGenerating(true);
    setQuestion(null);
    setPicked(null);
    window.setTimeout(() => {
      setQuestion(t(`quizWidget.questions.${subject}`, { returnObjects: true }) as QuizQuestion);
      setGenerating(false);
    }, 900);
  };

  const pick = (i: number) => {
    if (picked !== null || !question) return;
    setPicked(i);
    const correct = i === question.answer;
    toast({
      variant: correct ? 'success' : 'warning',
      title: correct ? t('quizWidget.correct') : t('quizWidget.incorrect'),
      description: correct ? t('quizWidget.correctDesc') : t('quizWidget.incorrectDesc'),
    });
  };

  return (
    <Card variant="elevated" padding="lg" className="flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <IconBox tone="ai" size="md"><ListChecks /></IconBox>
        <div className="min-w-0">
          <h3 className="font-semibold text-text-primary">{t('quizWidget.title')}</h3>
          <p className="text-caption text-text-tertiary">{t('quizWidget.subtitle')}</p>
        </div>
      </div>

      {/* Subject chips */}
      <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label={t('quizWidget.subject')}>
        {(Object.keys(subjects) as Subject[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => { setSubject(key); setQuestion(null); setPicked(null); }}
            aria-pressed={subject === key}
            className={cn(
              'px-3 py-1.5 rounded-full text-caption font-medium border transition-colors',
              subject === key
                ? 'bg-ai-bg text-ai border-ai/30'
                : 'bg-surface text-text-secondary border-surface-border hover:border-surface-border-hover'
            )}
          >
            {subjects[key]}
          </button>
        ))}
        <span className="px-3 py-1.5 rounded-full text-caption font-medium bg-surface-secondary text-text-tertiary border border-surface-border">
          {t('quizWidget.difficulty')}: {difficulties.medium}
        </span>
      </div>

      {/* Question area */}
      <div className="flex-1 flex flex-col">
        {generating && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8" role="status">
            <div className="w-8 h-8 rounded-full border-2 border-ai/20 border-t-ai animate-spin" />
            <p className="text-caption text-text-secondary">{t('quizWidget.generating')}</p>
          </div>
        )}

        {!generating && !question && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8 text-center">
            <IconBox tone="neutral" size="lg"><BrainCircuit /></IconBox>
            <p className="text-caption text-text-tertiary max-w-[220px]">{t('quizWidget.subtitle')}</p>
          </div>
        )}

        {!generating && question && (
          <div className="animate-fade-in-up">
            <Badge variant="ai" size="xs" className="mb-2">{t('quizWidget.question', { n: 1 })}</Badge>
            <p className="text-body font-medium text-text-primary mb-3">{question.q}</p>
            <div className="space-y-2" role="group">
              {question.options.map((option, i) => {
                const isAnswer = i === question.answer;
                const isPicked = picked === i;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => pick(i)}
                    disabled={picked !== null}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border text-body-sm text-start transition-colors',
                      picked === null && 'border-surface-border hover:border-brand hover:bg-brand-bg/40',
                      picked !== null && isAnswer && 'border-success bg-success-bg text-success',
                      picked !== null && isPicked && !isAnswer && 'border-error bg-error-bg text-error',
                      picked !== null && !isPicked && !isAnswer && 'border-surface-border opacity-50'
                    )}
                  >
                    <span>{option}</span>
                    {picked !== null && isAnswer && <Check className="w-4 h-4 flex-shrink-0" />}
                    {picked !== null && isPicked && !isAnswer && <X className="w-4 h-4 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
            <Button variant="outline" size="sm" fullWidth className="mt-3" leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={generate}>
              {t('quizWidget.next')}
            </Button>
          </div>
        )}
      </div>

      {!question && !generating && (
        <Button variant="ai" size="sm" fullWidth className="mt-4" leftIcon={<BrainCircuit className="w-4 h-4" />} onClick={generate}>
          {t('quizWidget.generate')}
        </Button>
      )}
    </Card>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Achievements + streak tracker
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
interface BadgeDef {
  key: string;
  icon: React.ReactNode;
  earned: boolean;
}

const BADGE_DEFS: BadgeDef[] = [
  { key: 'firstQuiz', icon: <Star />, earned: true },
  { key: 'streak7', icon: <Flame />, earned: true },
  { key: 'nightOwl', icon: <Moon />, earned: false },
  { key: 'tenLessons', icon: <BookCheck />, earned: true },
  { key: 'perfectScore', icon: <Target />, earned: false },
  { key: 'courseComplete', icon: <Trophy />, earned: false },
];

const WEEK_DONE = [true, true, true, false, true, true, false]; // study history, today last

export function AchievementsCard() {
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');
  const days = tc('daysOfWeekShort', { returnObjects: true }) as string[];
  const earnedCount = BADGE_DEFS.filter((b) => b.earned).length;

  return (
    <Card variant="elevated" padding="lg" className="flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <IconBox tone="accent" size="md"><Trophy /></IconBox>
        <div className="min-w-0">
          <h3 className="font-semibold text-text-primary">{t('achievements.title')}</h3>
          <p className="text-caption text-text-tertiary">{t('achievements.earned', { count: earnedCount, total: BADGE_DEFS.length })}</p>
        </div>
      </div>

      {/* Streak tracker */}
      <div className="rounded-xl bg-accent-bg border border-accent/20 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-accent" aria-hidden="true" />
            <span className="font-bold text-text-primary">7 {t('streak')}</span>
          </div>
          <Badge variant="warning" size="xs">{t('achievements.week')}</Badge>
        </div>
        <div className="grid grid-cols-7 gap-1.5" role="img" aria-label={`7 ${t('streak')}`}>
          {WEEK_DONE.map((done, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[9px] text-text-tertiary">{days[i]}</span>
              <span
                className={cn(
                  'w-full h-7 rounded-md flex items-center justify-center transition-colors',
                  done
                    ? 'bg-accent/85'
                    : i === WEEK_DONE.length - 1
                      ? 'border-2 border-dashed border-accent/50'
                      : 'bg-surface-border/50'
                )}
              >
                {done && <Flame className="w-3 h-3 text-white" aria-hidden="true" />}
              </span>
            </div>
          ))}
        </div>
        <p className="text-caption text-text-secondary mt-2.5">{t('achievements.streakSubtitle')}</p>
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-3 gap-2 flex-1 content-start">
        {BADGE_DEFS.map((badge) => (
          <div
            key={badge.key}
            className={cn(
              'flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition-colors',
              badge.earned
                ? 'bg-warning-bg/60 border-warning/25'
                : 'bg-surface-secondary border-surface-border opacity-60'
            )}
            title={badge.earned ? t(`achievements.badges.${badge.key}`) : t('achievements.locked')}
          >
            <span
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center',
                badge.earned ? 'bg-warning text-white' : 'bg-surface-border text-text-tertiary'
              )}
            >
              {badge.earned ? badge.icon : <Lock className="w-3.5 h-3.5" />}
            </span>
            <span className="text-[10px] leading-tight text-text-secondary font-medium">
              {t(`achievements.badges.${badge.key}`)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
