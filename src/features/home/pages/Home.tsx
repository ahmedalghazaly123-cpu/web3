import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { CourseCover } from '../../../shared/components/ui/CourseCover';
import { IconBox } from '../../../shared/components/ui/IconBox';
import { ProgressRing } from '../../../shared/components/ui/ProgressRing';
import { SectionHeader } from '../../../shared/components/layout/Section';
import { LandingHeader } from '../components/LandingHeader';
import { Testimonials, Faq } from '../components/HomeExtras';
import { useLocalized } from '../../../shared/lib/i18n-helpers';
import { courses } from '../../../data';
import type { Course } from '../../../shared/types';
import {
    BrainCircuit, TrendingUp, Clock, Star, Users,
  Sparkles, Flame, PlayCircle, BarChart3, BookOpen, GraduationCap,
  CheckCircle2, Compass, Lightbulb, HelpCircle, ListChecks, FileText,
} from 'lucide-react';

export default function HomePage() {
    const { t } = useTranslation('home');

  const stats = [
    { ...(t('stats.items.hours', { returnObjects: true }) as { value: string; label: string }), tone: 'ai' as const, icon: <BrainCircuit /> },
    { ...(t('stats.items.personalized', { returnObjects: true }) as { value: string; label: string }), tone: 'brand' as const, icon: <TrendingUp /> },
    { ...(t('stats.items.subjects', { returnObjects: true }) as { value: string; label: string }), tone: 'info' as const, icon: <GraduationCap /> },
    { ...(t('stats.items.adaptive', { returnObjects: true }) as { value: string; label: string }), tone: 'accent' as const, icon: <Sparkles /> },
  ];

  const pillars = [
    { title: t('value.item1'), description: t('value.item1Desc'), tone: 'ai' as const, icon: <BrainCircuit /> },
    { title: t('value.item2'), description: t('value.item2Desc'), tone: 'brand' as const, icon: <BarChart3 /> },
    { title: t('value.item3'), description: t('value.item3Desc'), tone: 'info' as const, icon: <BookOpen /> },
  ];

  const aiActions = [
    { label: t('aiTutor.actions.explain'), icon: <Lightbulb className="w-3.5 h-3.5" /> },
    { label: t('aiTutor.actions.hint'), icon: <HelpCircle className="w-3.5 h-3.5" /> },
    { label: t('aiTutor.actions.quiz'), icon: <ListChecks className="w-3.5 h-3.5" /> },
    { label: t('aiTutor.actions.summarize'), icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  return (
    <>
      <LandingHeader />
      {/* ━━━─ Hero ━━━─ */}
      <section className="relative pt-14 pb-20 lg:pt-20 lg:pb-24 bg-surface-secondary hero-glow overflow-hidden">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Copy */}
            <div className="animate-fade-in-up">
                            <Badge variant="primary" size="md" className="mb-5 gap-1.5 !py-1.5 !px-3">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                {t('hero.eyebrow')}
              </Badge>
              <h1 className="display-lg text-text-primary mb-6">
                {t('hero.headline')}
              </h1>
              <p className="body-lg text-text-secondary mb-8 max-w-lg leading-relaxed">
                {t('hero.subhead')}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/register">
                  <Button variant="primary" size="lg">{t('hero.primaryCta')}</Button>
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-9 text-sm text-text-secondary">
                <div className="flex items-center gap-2.5">
                  <div className="flex -space-x-2 rtl:space-x-reverse">
                    {['/avatars/student.svg', '/avatars/instructor-1.svg', '/avatars/instructor-3.svg', '/avatars/instructor-5.svg'].map((src) => (
                      <img
                        key={src}
                        src={src}
                        alt=""
                        className="w-7 h-7 rounded-full border-2 border-surface-secondary bg-surface object-cover"
                        loading="lazy"
                      />
                    ))}
                  </div>
                  <span>{t('hero.trustedBy')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-accent fill-current" aria-hidden="true" />
                  <span className="font-medium">{t('hero.rating')}</span>
                </div>
              </div>
            </div>
            {/* Product visual — mini dashboard mock */}
            <div className="relative animate-fade-in-up [animation-delay:120ms]" aria-hidden="true">
              {/* Floating streak card */}
              <div className="absolute -top-5 -start-3 lg:-start-6 z-10 bg-surface border border-surface-border rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-2.5 animate-float">
                <IconBox tone="accent" size="sm"><Flame /></IconBox>
                <div className="leading-tight">
                  <p className="text-sm font-bold text-text-primary">7</p>
                  <p className="text-[10px] text-text-secondary">{t('hero.mock.streak')}</p>
                </div>
              </div>

              <div className="relative bg-surface rounded-2xl shadow-xl border border-surface-border overflow-hidden">
                {/* Mock header */}
                <div className="px-4 py-3 border-b border-surface-border bg-surface-secondary/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
                      <Compass className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-text-primary">LearnPilot</span>
                  </div>
                  <Badge variant="ai" size="sm" className="gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI
                  </Badge>
                </div>

                <div className="p-4 space-y-4">
                  {/* Progress row */}
                  <div className="flex items-center gap-4 rounded-xl bg-brand-bg border border-brand/10 p-3.5">
                    <ProgressRing value={65} size={64} strokeWidth={5} center />
                    <div className="min-w-0">
                      <p className="text-caption text-text-secondary mb-0.5">{t('hero.mock.progressLabel')}</p>
                      <p className="text-sm font-semibold text-text-primary truncate">{t('hero.mock.courseName')}</p>
                      <div className="mt-1.5 flex items-center gap-1 text-caption text-brand font-medium">
                        <PlayCircle className="w-3.5 h-3.5" />
                        27/42
                      </div>
                    </div>
                  </div>

                  {/* Today's focus */}
                  <div>
                    <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-widest mb-2">
                      {t('hero.mock.todaysFocus')}
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 rounded-lg border border-surface-border bg-surface px-3 py-2">
                        <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                        <span className="text-body-sm text-text-tertiary line-through truncate">{t('hero.mock.task1')}</span>
                      </div>
                      <div className="flex items-center gap-2.5 rounded-lg border border-surface-border-strong bg-surface px-3 py-2 ring-1 ring-brand/20">
                        <span className="w-4 h-4 rounded border-2 border-brand flex-shrink-0" />
                        <span className="text-body-sm text-text-primary font-medium truncate">{t('hero.mock.task2')}</span>
                        <Clock className="w-3.5 h-3.5 text-text-tertiary ms-auto flex-shrink-0" />
                        <span className="text-caption text-text-tertiary">{t('hero.mock.taskTime')}</span>
                      </div>
                    </div>
                  </div>

                  {/* AI hint bubble */}
                  <div className="rounded-xl bg-ai-bg border border-ai/15 p-3">
                    <div className="flex items-start gap-2.5">
                      <IconBox tone="ai" size="sm"><BrainCircuit /></IconBox>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ai mb-0.5">{t('hero.mock.aiHint')}</p>
                        <p className="text-body-sm text-text-primary">{t('hero.mock.aiMessage')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━─ Stats band ━━━─ */}
      <section className="py-14 bg-surface border-b border-surface-border">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-8">
          <h2 className="h3 text-text-primary text-center mb-10">{t('stats.title')}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 stagger">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center text-center gap-3">
                <IconBox tone={stat.tone} size="lg">{stat.icon}</IconBox>
                <div>
                  <p className="text-2xl font-bold text-text-primary tracking-tight">{stat.value}</p>
                  <p className="text-body-sm text-text-secondary mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━─ Value pillars ━━━─ */}
      <section id="features" className="py-16 lg:py-20 bg-surface scroll-mt-20">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-8">
          <SectionHeader title={t('value.title')} subtitle={t('value.subtitle')} centered />
          <div className="grid md:grid-cols-3 gap-8 stagger">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="text-center px-4">
                <IconBox tone={pillar.tone} size="xl" className="mx-auto mb-5">{pillar.icon}</IconBox>
                <h3 className="h4 text-text-primary mb-2">{pillar.title}</h3>
                <p className="body-sm text-text-secondary max-w-xs mx-auto">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━─ AI Tutor showcase ━━━─ */}
      <section id="how-it-works" className="py-16 lg:py-20 bg-surface-secondary border-y border-surface-border scroll-mt-20">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="ai" size="md" className="mb-4 gap-1.5">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                AI
              </Badge>
              <h2 className="h2 text-text-primary mb-4">{t('aiTutor.title')}</h2>
              <p className="body-lg text-text-secondary mb-7 max-w-lg">{t('aiTutor.subtitle')}</p>
              <div className="flex flex-wrap gap-2 mb-8">
                {aiActions.map((action) => (
                  <span
                    key={action.label}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-surface-border text-body-sm text-text-secondary"
                  >
                    <span className="text-ai">{action.icon}</span>
                    {action.label}
                  </span>
                ))}
              </div>
              <Link to="/register">
                <Button variant="primary" size="md">{t('aiTutor.learnMore')}</Button>
              </Link>
            </div>

            {/* AI workspace visual */}
            <div className="relative" aria-hidden="true">
              <div className="bg-surface rounded-2xl border border-surface-border shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between bg-surface-secondary/60">
                  <div className="flex items-center gap-2.5">
                    <IconBox tone="ai" size="sm"><BrainCircuit /></IconBox>
                    <div className="leading-tight">
                      <p className="text-xs text-text-tertiary">{t('aiTutor.visual.lesson')}</p>
                      <p className="text-sm font-semibold text-text-primary">{t('aiTutor.visual.lessonName')}</p>
                    </div>
                  </div>
                  <Badge variant="ai" size="sm">{t('aiTutor.visual.step')}</Badge>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-end">
                    <p className="max-w-[75%] rounded-2xl rounded-ee-sm bg-brand text-white text-body-sm px-3.5 py-2">
                      {t('aiTutor.actions.explain')} — lim(x→2)
                    </p>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-ss-sm bg-surface-tertiary px-3.5 py-2.5">
                      <p className="text-body-sm text-text-primary leading-relaxed">
                        (x² − 4)/(x − 2) = (x−2)(x+2)/(x−2)
                      </p>
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between text-caption text-text-secondary mb-1">
                          <span>{t('aiTutor.visual.understanding')}</span>
                          <span className="font-semibold text-success">85%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-surface-border overflow-hidden">
                          <div className="h-full w-[85%] rounded-full bg-success" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    {aiActions.slice(0, 3).map((action) => (
                      <span key={action.label} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-ai-bg text-ai text-caption font-medium">
                        {action.icon}
                        {action.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━─ Courses ━━━─ */}
      <section id="courses" className="py-16 lg:py-20 bg-surface scroll-mt-20">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <SectionHeader title={t('courses.title')} subtitle={t('courses.subtitle')} className="!mb-0" />
            <Link to="/register" className="text-sm font-semibold text-brand hover:text-brand-hover transition-colors">
              {t('courses.viewAll')} →
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
            {courses.slice(0, 3).map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      </section>

      {/* ━━━─ Testimonials ━━━─ */}
      <Testimonials />

      {/* ━━━─ FAQ ━━━─ */}
      <Faq />

      {/* ━━━─ Final CTA ━━━─ */}
      <section className="py-16 lg:py-20 bg-brand">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-8 text-center">
          <h2 className="display-sm text-white mb-4">{t('cta.headline')}</h2>
          <p className="body-lg text-white/85 mb-8 max-w-xl mx-auto">{t('cta.subhead')}</p>
          <Link to="/register">
            <Button
              variant="surface"
              size="lg"
              className="!text-brand hover:!bg-surface-secondary"
              rightIcon={<Sparkles className="w-4 h-4" />}
            >
              {t('cta.primaryCta')}
            </Button>
          </Link>
        </div>
      </section>

      {/* ━━━─ Footer ━━━─ */}
      <footer className="py-10 bg-surface border-t border-surface-border">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
              <Compass className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
            <span className="font-bold text-text-primary">LearnPilot</span>
          </div>
          <p className="text-caption text-text-tertiary text-center">{t('footer.rights')}</p>
          <div className="flex items-center gap-5 text-sm">
            <Link to="/login" className="text-text-secondary hover:text-text-primary transition-colors">{t('footer.signIn')}</Link>
            <Link to="/register" className="text-text-secondary hover:text-text-primary transition-colors">{t('footer.register')}</Link>
          </div>
        </div>
      </footer>
    </>
  );
}

function CourseCard({ course }: { course: Course }) {
  const { t } = useTranslation('home');
  const { pick } = useLocalized();
  const c = pick(course);
  return (
    <Link to={`/courses/${course.id}`} className="block group">
      <div className="bg-surface border border-surface-border rounded-xl overflow-hidden shadow-sm group-hover:shadow-lg group-hover:border-surface-border-hover transition-all duration-200 ease-out h-full flex flex-col">
        <CourseCover src={course.image} alt={c.title} className="aspect-video">
          <Badge className="absolute top-3 end-3" variant="surface">{c.category}</Badge>
        </CourseCover>
        <div className="p-4 flex flex-col flex-1">
          <h3 className="h4 text-text-primary group-hover:text-brand transition-colors mb-1">{c.title}</h3>
          <p className="body-sm text-text-secondary line-clamp-2 mb-3">{c.description}</p>
          <div className="flex items-center gap-2 text-caption text-text-tertiary mt-auto">
            <Users className="w-4 h-4" aria-hidden="true" />
            <span>{course.students.toLocaleString()} {t('courses.students')}</span>
            <Star className="w-4 h-4 text-accent fill-current ms-1" aria-hidden="true" />
            <span>{course.rating}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
