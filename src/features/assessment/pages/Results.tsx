import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { ProgressBar } from '../../../shared/components/ui/ProgressBar';
import { CheckCircle, XCircle, TrendingUp, BookOpen, Target, ChevronRight } from 'lucide-react';
import { useAuth } from '../../../app/layout/AuthProvider';
import { learningSync } from '../../../shared/services/learningSync';
import { store } from '../../../shared/services/store';
import type { MasteryRecord } from '../../../shared/domain';

interface ScoreInfo { correct: number; total: number; score: number }

function readStoredScore(): ScoreInfo | null {
  try {
    const raw = localStorage.getItem('lastQuizScore');
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed.correct === 'number' && typeof parsed.total === 'number' && parsed.total > 0) {
      return { correct: parsed.correct, total: parsed.total, score: Math.round((parsed.correct / parsed.total) * 100) };
    }
  } catch {
    /* corrupted storage */
  }
  return null;
}

const WEAK_TOPIC_LABEL: Record<string, string> = {
  'concept-limits': 'Limits',
  'concept-derivatives': 'Derivatives',
  'concept-continuity': 'Continuity',
};

export default function ResultsPage() {
  const { t } = useTranslation('assessment');
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.id;

  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<ScoreInfo | null>(null);
  const [masteryPercent, setMasteryPercent] = useState<number>(0);
  const [weakTopics, setWeakTopics] = useState<MasteryRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      if (studentId) {
        await learningSync.hydrate(studentId);
        // Authoritative: derive the latest quiz/submitted score from the backend event log.
        const events = store.events.listByStudent(studentId);
        const submitted = [...events].reverse().find((e: any) => e.kind === 'quiz-submitted' || e.kind === 'exam-submitted');
        const p = submitted?.payload as { score?: number; total?: number; correct?: number } | undefined;
        if (p && typeof p.score === 'number' && typeof p.total === 'number') {
          setScore({ correct: p.correct ?? 0, total: p.total, score: p.score });
        } else {
          // Fallback to persisted mastery % if no submission event is on record.
          setScore(null);
        }
        const progress = await learningSync.getProgress() as { masteryPercent?: number } | null;
        setMasteryPercent(progress?.masteryPercent ?? 0);
        setWeakTopics(
          store.mastery.listByStudent(studentId).filter((m) => (m.mastery ?? 0) < 60),
        );
      } else {
        // No backend session: keep read-only display from any local cache.
        setScore(readStoredScore());
      }
      setLoading(false);
    };
    load();
  }, [studentId]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-surface-secondary py-8">
        <div className="max-w-4xl mx-auto px-4">
          <p className="body text-text-secondary">{t('loading')}</p>
        </div>
      </div>
    );
  }

  const correctAnswers = score?.correct ?? (studentId ? 0 : readStoredScore()?.correct ?? 0);
  const totalQuestions = score?.total ?? (studentId ? 0 : readStoredScore()?.total ?? 4);
  const displayScore = score?.score ?? Math.round((correctAnswers / (totalQuestions || 1)) * 100);
  const passed = displayScore >= 70;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-surface-secondary py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-brand-bg mb-4">
            <span className="text-4xl font-bold">{displayScore}%</span>
          </div>
          <h1 className="display-md text-text-primary mb-2">
            {passed ? t('resultsPage.greatTitle') : t('resultsPage.keepPracticing')}
          </h1>
          <p className="body text-text-secondary max-w-md mx-auto">
            {t('resultsPage.answeredOf', { correct: correctAnswers, total: totalQuestions })}
            {passed ? t('resultsPage.passedSuffix') : t('resultsPage.failedSuffix')}
            <span className="block text-caption text-text-tertiary mt-1">
              {studentId
                ? t('resultsPage.authoritative', { mastery: masteryPercent })
                : t('resultsPage.offlineFallback')}
            </span>
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card variant="elevated" padding="md" className="text-center">
            <CheckCircle className="w-6 h-6 text-success mx-auto mb-2" />
            <div className="text-2xl font-bold text-success">{correctAnswers}</div>
            <p className="text-caption text-text-tertiary">{t('correct')}</p>
          </Card>
          <Card variant="elevated" padding="md" className="text-center">
            <XCircle className="w-6 h-6 text-error mx-auto mb-2" />
            <div className="text-2xl font-bold text-error">{totalQuestions - correctAnswers}</div>
            <p className="text-caption text-text-tertiary">{t('incorrect')}</p>
          </Card>
          <Card variant="elevated" padding="md" className="text-center">
            <Target className="w-6 h-6 text-warning mx-auto mb-2" />
            <div className="text-2xl font-bold text-text-primary">{Math.max(0, Math.round((weakTopics.length / 3) * 100))}</div>
            <p className="text-caption text-text-tertiary">{t('resultsPage.currentLevel')}</p>
          </Card>
        </div>

        <div className="space-y-6">
          <h2 className="h3 text-text-primary">{t('resultsPage.detailedResults')}</h2>
          <Card variant="elevated" padding="md">
            <ProgressBar value={displayScore} variant={passed ? 'success' : 'warning'} label />
            <p className="text-caption text-text-tertiary mt-2">{t('resultsPage.passingScore')}</p>
          </Card>

          <div>
            <h3 className="h4 text-text-primary mb-3">{t('weakTopics')}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {weakTopics.length === 0 ? (
                <p className="body text-text-secondary">{t('resultsPage.noWeakTopics')}</p>
              ) : (
                weakTopics.slice(0, 6).map((m) => (
                  <WeakTopic
                    key={m.id}
                    topic={WEAK_TOPIC_LABEL[m.nodeId] ?? m.nodeId}
                    mastery={m.mastery ?? 0}
                  />
                ))
              )}
            </div>
          </div>

          <div>
            <h3 className="h4 text-text-primary mb-3">{t('recommendations')}</h3>
            <div className="space-y-3">
              <Recommendation title={t('resultsPage.rec1Title')} description={t('resultsPage.rec1Desc')} icon={<BookOpen className="w-5 h-5 text-brand" />} />
              <Recommendation title={t('resultsPage.rec2Title')} description={t('resultsPage.rec2Desc')} icon={<Target className="w-5 h-5 text-success" />} />
              <Recommendation title={t('resultsPage.rec3Title')} description={t('resultsPage.rec3Desc')} icon={<TrendingUp className="w-5 h-5 text-ai" />} />
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/courses/calculus-1">
            <Button variant="primary" size="lg">{t('resultsPage.continueStudying')}</Button>
          </Link>
          <Button variant="surface" size="lg" onClick={() => navigate('/planner')}>
            {t('resultsPage.reviewWeakTopics')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function WeakTopic({ topic, mastery }: { topic: string; mastery: number }) {
  return (
    <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
      <span className="font-medium text-text-primary">{topic}</span>
      <div className="flex items-center gap-2">
        <ProgressBar value={mastery} variant="error" size="sm" />
        <span className="text-sm text-text-secondary w-10 text-end">{mastery}%</span>
      </div>
    </div>
  );
}

function Recommendation({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <Card variant="outlined" padding="md" className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <h4 className="font-medium text-text-primary">{title}</h4>
        <p className="text-sm text-text-secondary mt-1">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-text-tertiary" />
    </Card>
  );
}
