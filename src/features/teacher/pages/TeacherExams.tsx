import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Plus, Sparkles, Send } from 'lucide-react';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { Input } from '../../../shared/components/ui/Input';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { SectionTabs } from '../../../shared/components/layout/SectionTabs';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { teacherNav } from '../../../shared/components/layout/navGroups';
import { useToast } from '../../../shared/components/ui/ToastProvider';

interface Assessment {
  id: string; title: string; classKey: string; type: 'quiz' | 'exam';
  questions: number; duration: number; avgScore: number; attempts: number;
  highest: number; lowest: number;
}

const assessments: Assessment[] = [
  { id: 'e1', title: 'Midterm — Limits & Derivatives', classKey: 'classes.calculus', type: 'exam', questions: 12, duration: 60, avgScore: 74, attempts: 24, highest: 98, lowest: 41 },
  { id: 'e2', title: 'Chain Rule Quick Quiz', classKey: 'classes.calculus', type: 'quiz', questions: 8, duration: 15, avgScore: 81, attempts: 24, highest: 100, lowest: 55 },
  { id: 'e3', title: 'Determinants Quiz', classKey: 'classes.linearAlgebra', type: 'quiz', questions: 6, duration: 12, avgScore: 69, attempts: 19, highest: 95, lowest: 38 },
  { id: 'e4', title: 'Forces & Motion Final', classKey: 'classes.physics', type: 'exam', questions: 15, duration: 90, avgScore: 66, attempts: 27, highest: 92, lowest: 30 },
];

export default function TeacherExams() {
  const { t } = useTranslation('teacher');
  const { t: tc } = useTranslation('common');
  const toast = useToast();
  const [tab, setTab] = useState<'exams' | 'quizzes' | 'grades'>('exams');
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState('');
  const [duration, setDuration] = useState('');
  const [isExam, setIsExam] = useState(true);
  const [items, setItems] = useState<Assessment[]>(assessments);
  const [formErr, setFormErr] = useState('');

  const visible = items.filter((a) => (tab === 'grades' ? true : a.type === (tab === 'exams' ? 'exam' : 'quiz')));
  const qOk = /^\d+$/.test(questions.trim()) && Number(questions) >= 1 && Number(questions) <= 50;
  const dOk = /^\d+$/.test(duration.trim()) && Number(duration) >= 1 && Number(duration) <= 180;
  const canPublish = title.trim().length > 0 && qOk && dOk;

  const publish = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length === 0) { setFormErr(t('examPage.titleRequired')); return; }
    if (!qOk) { setFormErr(t('examPage.questionsInvalid')); return; }
    if (!dOk) { setFormErr(t('examPage.durationInvalid')); return; }
    setFormErr('');
    const created: Assessment = {
      id: `new-${Date.now()}`,
      title: title.trim(),
      classKey: 'classes.calculus',
      type: isExam ? 'exam' : 'quiz',
      questions: Number(questions),
      duration: Number(duration),
      avgScore: 0, attempts: 0, highest: 0, lowest: 0,
    };
    setItems((cur) => [created, ...cur]);
    setTab(isExam ? 'exams' : 'quizzes');
    toast({ variant: 'success', title: t('examPage.published'), description: t('examPage.examGenerated') });
    setTitle(''); setQuestions(''); setDuration('');
  };

  return (
    <div className="space-y-6 pb-8 page-enter">
      <PageHeader
        icon={<FileText className="w-6 h-6" />}
        title={t('examPage.title')}
        subtitle={t('examPage.subtitle')}
        actions={
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => document.getElementById('new-assessment')?.scrollIntoView({ behavior: 'smooth' })}>
            {t('examPage.newExam')}
          </Button>
        }
      />
      <SectionTabs items={teacherNav} label={tc('nav.teacher')} />
      <div className="flex gap-2" role="tablist" aria-label={t('examPage.title')}>
        {(['exams', 'quizzes', 'grades'] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={tab === f}
            onClick={() => setTab(f)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
              tab === f ? 'bg-brand-bg text-brand border-brand-border font-semibold' : 'bg-surface text-text-secondary border-surface-border hover:bg-surface-secondary'
            }`}
          >
            {f === 'exams' ? t('examPage.examsTab') : f === 'quizzes' ? t('examPage.quizzesTab') : t('examPage.gradesTab')}
          </button>
        ))}
      </div>

      {tab === 'grades' ? (
        <Card variant="elevated" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-secondary border-b border-surface-border">
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('examPage.gradeColumn')}</th>
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('examPage.title')}</th>
                  <th scope="col" className="px-4 py-3 text-start text-caption font-semibold text-text-tertiary uppercase tracking-wide">{t('examPage.scoreColumn')}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Omar Khaled', title: 'Chain Rule Quick Quiz', score: 88 },
                  { name: 'Lina Mostafa', title: 'Determinants Quiz', score: 92 },
                  { name: 'Youssef Adel', title: 'Midterm — Limits & Derivatives', score: 64 },
                  { name: 'Mariam Sameh', title: 'Forces & Motion Final', score: 79 },
                ].map((g) => (
                  <tr key={g.name} className="border-b border-surface-border last:border-0 hover:bg-surface-secondary/60 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-text-primary">{g.name}</td>
                    <td className="px-4 py-3.5 text-body-sm text-text-secondary">{g.title}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant={g.score >= 80 ? 'success' : g.score >= 60 ? 'warning' : 'error'}>{g.score}%</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : visible.length === 0 ? (
        <EmptyState icon={<FileText className="w-6 h-6" />} title={t('examPage.emptyTitle')} description={t('examPage.emptyDesc')} illustration="/illustrations/empty-exams.svg" />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {visible.map((a) => (
            <Card key={a.id} variant="elevated" padding="lg" className="card-lift">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-text-primary truncate">{a.title}</h3>
                  <p className="text-caption text-text-tertiary mt-0.5">{t(a.classKey)}</p>
                </div>
                <Badge variant={a.type === 'exam' ? 'primary' : 'ai'}>{a.type === 'exam' ? t('examPage.typeExam') : t('examPage.typeQuiz')}</Badge>
              </div>
              <div className="flex gap-4 mt-4 text-caption text-text-secondary">
                <span>{t('examPage.questions')}: <strong className="text-text-primary">{a.questions}</strong></span>
                <span>{t('examPage.durationLabel')}: <strong className="text-text-primary">{a.duration} {t('examPage.minutesLabel')}</strong></span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="rounded-lg bg-surface-secondary p-2.5 text-center">
                  <p className="text-caption text-text-tertiary">{t('examPage.avgScore')}</p>
                  <p className="font-bold text-text-primary">{a.avgScore}%</p>
                </div>
                <div className="rounded-lg bg-surface-secondary p-2.5 text-center">
                  <p className="text-caption text-text-tertiary">{t('examPage.highest')}</p>
                  <p className="font-bold text-success">{a.highest}%</p>
                </div>
                <div className="rounded-lg bg-surface-secondary p-2.5 text-center">
                  <p className="text-caption text-text-tertiary">{t('examPage.lowest')}</p>
                  <p className="font-bold text-error">{a.lowest}%</p>
                </div>
              </div>
              <p className="text-caption text-text-tertiary mt-3">{a.attempts} {t('examPage.attempts')}</p>
            </Card>
          ))}
        </div>
      )}
      <Card id="new-assessment" variant="elevated" padding="lg">
        <h2 className="h4 text-text-primary mb-4">{t('examPage.newExam')}</h2>
        <form
          className="grid gap-4 sm:grid-cols-3"
          onSubmit={publish}
        >
          <Input label={t('examPage.titleLabel')} required placeholder={t('examPage.titlePlaceholder')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label={t('examPage.questions')} required type="number" min={1} max={50} placeholder="10" value={questions} onChange={(e) => setQuestions(e.target.value)} error={!qOk && questions.trim() !== '' ? t('examPage.questionsInvalid') : undefined} />
          <Input label={t('examPage.durationLabel')} required type="number" min={1} max={180} placeholder="30" value={duration} onChange={(e) => setDuration(e.target.value)} error={!dOk && duration.trim() !== '' ? t('examPage.durationInvalid') : undefined} />
          {formErr && (
            <p role="alert" className="sm:col-span-3 text-sm text-error bg-error-bg border border-error/20 rounded-lg px-3 py-2.5">{formErr}</p>
          )}
          <div className="sm:col-span-2 flex items-center gap-2 flex-wrap">
            <span className="text-label font-medium text-text-primary">{t('examPage.type')}</span>
            <button type="button" onClick={() => setIsExam(true)} aria-pressed={isExam} className={`px-3 py-1.5 rounded-lg text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${isExam ? 'bg-brand-bg text-brand border-brand-border font-semibold' : 'bg-surface text-text-secondary border-surface-border'}`}>{t('examPage.typeExam')}</button>
            <button type="button" onClick={() => setIsExam(false)} aria-pressed={!isExam} className={`px-3 py-1.5 rounded-lg text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${!isExam ? 'bg-ai-bg text-ai border-ai-border font-semibold' : 'bg-surface text-text-secondary border-surface-border'}`}>{t('examPage.typeQuiz')}</button>
            <span className="inline-flex items-center gap-1 text-caption text-ai ms-2">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              {t('examPage.examGenerated')}
            </span>
          </div>
          <div className="sm:col-span-3 flex justify-end">
            <Button type="submit" variant="primary" leftIcon={<Send className="w-4 h-4" />} disabled={!canPublish}>{t('examPage.publish')}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
