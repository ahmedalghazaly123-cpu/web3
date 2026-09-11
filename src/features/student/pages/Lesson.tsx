import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { ProgressBar } from '../../../shared/components/ui/ProgressBar';
import { calculusSections } from '../../../data';
import {
  Play, SkipBack, SkipForward, Check, Bookmark,
  MessageSquare, MoreVertical, BookOpen,
} from 'lucide-react';

export default function LessonPage() {
  const { t } = useTranslation('courses');
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();

  const lessons = calculusSections.flatMap((s) => s.lessons);
  const index = lessons.findIndex((l) => l.id === lessonId);
  const lesson = index >= 0 ? lessons[index] : undefined;
  const prev = index > 0 ? lessons[index - 1] : undefined;
  const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : undefined;

  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 py-16 page-enter">
        <div className="w-16 h-16 rounded-2xl bg-surface-tertiary flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-text-tertiary" />
        </div>
        <h1 className="h3 text-text-primary mb-2">{t('lessonNotFound')}</h1>
        <p className="body text-text-secondary mb-6 max-w-sm">
          {t('lessonNotFoundDesc')}
        </p>
        <Link to={`/courses/${courseId ?? ''}`}>
          <Button variant="primary">{t('backToCourse')}</Button>
        </Link>
      </div>
    );
  }

  const base = `/courses/${courseId ?? 'calculus-1'}/lessons`;
  const lessonContent = `
In this lesson, we'll explore algebraic limit laws and how to evaluate limits analytically.

When direct substitution results in an indeterminate form like 0/0, we can use algebraic techniques:

  1. Factoring
  2. Rationalizing
  3. Simplifying complex fractions

Let's work through an example:

Evaluate: lim(x->2) (x^2 - 4)/(x - 2)

Solution:
  Step 1: Direct substitution gives 0/0 (indeterminate).
  Step 2: Factor the numerator: x^2 - 4 = (x - 2)(x + 2)
  Step 3: Cancel common factor: (x - 2)(x + 2) / (x - 2) = x + 2
  Step 4: Now substitute: 2 + 2 = 4

Answer: 4
  `;

  return (
    <div className="flex flex-col page-enter">
      {/* Video player */}
      <div className="bg-black rounded-2xl overflow-hidden mb-6 relative aspect-video flex-shrink-0 group cursor-pointer shadow-lg ring-1 ring-white/10">
        {/* Top badges */}
        <div className="absolute top-3 start-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-caption text-white font-medium">
          <BookOpen className="w-3.5 h-3.5 fill-current" />
          <span>{t(`types.${lesson.type}`, { defaultValue: lesson.type })}</span>
        </div>
        <div className="absolute top-3 end-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-caption text-white font-medium">
          <SkipForward className="w-3.5 h-3.5 -rotate-90 fill-current" />
          <span>{lesson.duration} {t('min')}</span>
        </div>

        {/* Play overlay */}
        <div className="w-full h-full flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-white/10 animate-ping pointer-events-none"></div>
            <div className="w-20 h-20 rounded-full bg-brand/90 backdrop-blur-sm flex items-center justify-center transition-all group-hover:scale-110 shadow-lg ring-4 ring-white/30">
              <Play className="w-9 h-9 fill-current" />
            </div>
          </div>
        </div>

        {/* Bottom control bar */}
        <div className="absolute bottom-0 inset-x-0 px-4 pt-2 pb-3 z-10">
          <div className="h-1.5 bg-white/20 rounded-full mb-2.5">
            <div className="h-full bg-brand rounded-full" style={{ width: '45%' }} />
          </div>
          <div className="flex items-center gap-2 text-caption text-white/85">
            <Play className="w-3 h-3 fill-current" />
            <span className="truncate flex-1 text-start">{lesson.title}</span>
            <span className="tabular-nums whitespace-nowrap">05:24 / 11:35</span>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 grid lg:grid-cols-3 gap-6">
{/* Main content */}
        <div className="lg:col-span-2 overflow-y-auto">
          <div className="prose max-w-none dark:prose-invert">
            <span className="text-caption text-text-tertiary">{lesson.duration} min · {lesson.type}</span>
            <h1 className="h1 text-text-primary mt-1 mb-4">{lesson.title}</h1>
            <div className="body text-text-secondary leading-relaxed whitespace-pre-wrap">
              {lessonContent}
            </div>
          </div>

          {/* Notes section */}
          <Card variant="elevated" padding="md" className="mt-6">
            <h3 className="h4 text-text-primary mb-2">{t('keyTakeaways')}</h3>
            <ul className="list-disc list-inside space-y-1 text-text-secondary">
              {(t('takeaways', { returnObjects: true }) as string[]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Action bar */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 space-y-4">
            {/* Action buttons */}
            <Card variant="elevated" padding="sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-text-primary">{t('lessonActions')}</h3>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm"><Bookmark className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm"><MessageSquare className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm"><MoreVertical className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="space-y-2">
                <Button variant="success" size="md" fullWidth leftIcon={<Check className="w-4 h-4" />}>
                  {t('completeLesson')}
                </Button>
                <Link to="/ai-tutor">
                  <Button variant="ai" size="md" fullWidth leftIcon={<MessageSquare className="w-4 h-4" />}>
                    {t('askAi')}
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Navigation */}
            <Card variant="elevated" padding="sm">
              <h3 className="font-medium text-text-primary mb-3">{t('courseContent')}</h3>
              <div className="space-y-1">
                {prev ? (
                  <Link to={`${base}/${prev.id}`} className="flex items-center gap-2 p-2 text-sm text-text-secondary hover:bg-surface-secondary rounded-lg transition-colors">
                    <SkipBack className="w-4 h-4" />
                    <span className="truncate">{prev.title}</span>
                  </Link>
                ) : (
                  <span className="flex items-center gap-2 p-2 text-sm text-text-tertiary opacity-60 cursor-not-allowed">
                    <SkipBack className="w-4 h-4" />
                    {t('startOfCourse')}
                  </span>
                )}
                {next ? (
                  <Link to={`${base}/${next.id}`} className="flex items-center justify-between gap-2 p-2 text-sm text-text-secondary hover:bg-surface-secondary rounded-lg transition-colors">
                    <span className="truncate">{next.title}</span>
                    <SkipForward className="w-4 h-4 flex-shrink-0" />
                  </Link>
                ) : (
                  <span className="flex items-center justify-between gap-2 p-2 text-sm text-text-tertiary opacity-60 cursor-not-allowed">
                    <span>{t('endOfCourse')}</span>
                    <SkipForward className="w-4 h-4 flex-shrink-0" />
                  </span>
                )}
              </div>
            </Card>

            {/* Progress */}
            <Card variant="elevated" padding="sm">
              <ProgressBar value={65} variant="brand" label />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}