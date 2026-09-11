import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { Card } from '../../../shared/components/ui/Card';
import { ProgressBar } from '../../../shared/components/ui/ProgressBar';
import { Avatar } from '../../../shared/components/ui/Avatar';
import { CourseCover } from '../../../shared/components/ui/CourseCover';
import { getCourseById, calculusSections } from '../../../data';
import { cn } from '../../../shared/lib/utils';
import {
  Clock, Users, Star, Play, Lock, CheckCircle,
  ChevronRight,
} from 'lucide-react';

export default function CoursePage() {
  const { t } = useTranslation('courses');
  const { courseId } = useParams<{ courseId: string }>();
  const course = courseId ? getCourseById(courseId) : undefined;

  if (!course) {
    return <div className="py-12 text-center text-text-secondary">{t('notFound')}</div>;
  }

  const sections = calculusSections;

  return (
    <div className="space-y-8 pb-8 page-enter">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-text-tertiary mb-4">
          <Link to="/courses" className="hover:text-text-primary transition-colors">{t('nav.courses', { ns: 'common' })}</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-text-secondary">{course.title}</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Badge variant="primary" size="sm">{course.category}</Badge>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-warning fill-current" />
                <span className="font-semibold text-text-primary">{course.rating}</span>
                <span className="text-text-tertiary">({course.students.toLocaleString()})</span>
              </div>
            </div>
            <h1 className="display-md text-text-primary mb-4">{course.title}</h1>
            <p className="body-lg text-text-secondary mb-6 max-w-2xl">{course.description}</p>

            {/* Instructor card */}
            <div className="flex items-center gap-4 p-4 bg-surface-secondary rounded-xl border border-surface-border mb-6">
              <Avatar src={course.instructorAvatar} name={course.instructor} size="lg" />
              <div>
                <p className="text-caption text-text-tertiary mb-0.5">{t('instructor')}</p>
                <p className="font-semibold text-text-primary">{course.instructor}</p>
              </div>
              <Button variant="outline" size="sm" className="ms-auto">{t('viewProfile')}</Button>
            </div>

            {/* Course meta */}
            <div className="flex flex-wrap gap-6 text-sm text-text-secondary">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-tertiary" />
                <span>{course.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-text-tertiary" />
                <span>{course.students.toLocaleString()} {t('students')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-text-tertiary" />
                <span>{course.totalLessons} {t('lessons')}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card variant="elevated" padding="none" className="overflow-hidden card-lift sticky top-6">
              <CourseCover src={course.image} alt={course.title} className="aspect-video" overlay>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-transform group-hover:scale-110">
                    <Play className="w-6 h-6 text-white ps-0.5" />
                  </span>
                </div>
              </CourseCover>
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="h4 text-text-primary">{t('currentLesson')}</h3>
                  <Badge variant="ai" size="xs">{t('inProgress')}</Badge>
                </div>
                <p className="body-sm text-text-secondary mb-4">{t('currentLessonDesc')}</p>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">{t('progress')}</span>
                    <span className="text-brand font-semibold">{Math.round(course.progress * 100)}%</span>
                  </div>
                  <ProgressBar value={course.progress * 100} variant="brand" size="md" />
                  <p className="text-caption text-text-tertiary">
                    {t('lessonsComplete', { done: course.completedLessons, total: course.totalLessons })}
                  </p>
                </div>
                <Link to={`/courses/${course.id}/lessons/3`}>
                  <Button variant="primary" size="md" fullWidth rightIcon={<Play className="w-4 h-4" />}>
                    {t('continue')}
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Curriculum */}
      <div>
        <h2 className="h2 text-text-primary mb-6">{t('curriculum')}</h2>
        <div className="space-y-6">
          {sections.map((section) => (
            <Card key={section.id} variant="elevated" padding="md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="h3 text-text-primary">{section.title}</h3>
                <Badge variant="outline" size="sm">
                  {section.lessons.filter(l => l.completed).length} / {section.lessons.length}
                </Badge>
              </div>
              <div className="space-y-1">
                {section.lessons.map((lesson) => {
                  const isCurrent = lesson.current;
                  const Icon = lesson.locked ? Lock : lesson.type === 'video' ? Play : CheckCircle;
                  return (
                    <Link
                      key={lesson.id}
                      to={`/courses/${course.id}/lessons/${lesson.id}`}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl transition-all group',
                        isCurrent ? 'bg-brand-bg border border-brand/20 shadow-sm' : 'hover:bg-surface-secondary border border-transparent',
                        lesson.locked && 'opacity-60 cursor-not-allowed',
                      )}
                    >
                      <div className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all',
                        isCurrent ? 'bg-brand text-white shadow-sm' : lesson.completed ? 'bg-success-bg text-success' : 'bg-surface-secondary text-text-tertiary group-hover:bg-surface-tertiary',
                      )}>
                        {lesson.completed ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('font-medium', isCurrent ? 'text-brand' : 'text-text-primary')}>{lesson.title}</p>
                        <div className="flex items-center gap-2 text-caption text-text-tertiary mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{lesson.duration} {t('min')}</span>
                          <Badge variant={lesson.type === 'video' ? 'primary' : lesson.type === 'interactive' ? 'ai' : 'secondary'} size="xs">
                            {t(`types.${lesson.type}`)}
                          </Badge>
                        </div>
                      </div>
                      {!lesson.locked && (
                        <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-brand transition-colors" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
