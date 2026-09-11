import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../../shared/components/ui/Badge';
import { Card } from '../../../shared/components/ui/Card';
import { ProgressBar } from '../../../shared/components/ui/ProgressBar';
import { CourseCover } from '../../../shared/components/ui/CourseCover';
import { courses } from '../../../data';
import { useLocalized } from '../../../shared/lib/i18n-helpers';
import {
  Clock, Users, Star, Search, Filter,
  LayoutGrid, Sigma, FlaskConical, Landmark, BookMarked,
} from 'lucide-react';

const categoryMeta: Record<string, { icon: typeof Sigma; tone: string }> = {
  All: { icon: LayoutGrid, tone: 'text-brand' },
  Mathematics: { icon: Sigma, tone: 'text-info' },
  Chemistry: { icon: FlaskConical, tone: 'text-success' },
  History: { icon: Landmark, tone: 'text-accent' },
  Heritage: { icon: BookMarked, tone: 'text-ai' },
};

const categoryLabelKeys: Record<string, string> = {
  All: 'courses.categories.all',
  Mathematics: 'courses.categories.mathematics',
  Chemistry: 'courses.categories.chemistry',
  History: 'courses.categories.history',
  Heritage: 'courses.categories.heritage',
};

export default function CoursesPage() {
  const { t } = useTranslation('courses');
  const { pick } = useLocalized();

  const categories = ['All', 'Mathematics', 'Chemistry', 'History', 'Heritage'];
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All' ? courses : courses.filter(c => c.category === activeCategory);

  return (
    <div className="space-y-6 pb-8 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="display-sm text-text-primary">{t('title')}</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input type="search" placeholder={t('nav.search', { ns: 'common' })} className="ps-10 pe-4 h-9 text-sm bg-surface border border-surface-border rounded-lg focus:outline-none focus:border-brand" />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded-lg border border-surface-border transition-colors">
            <Filter className="w-4 h-4" />
            <span>{t('filter')}</span>
          </button>
        </div>
      </div>

      {/* Category filters — icon + tinted chips, not plain boxes */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const meta = categoryMeta[cat];
          const Icon = meta.icon;
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              aria-pressed={isActive}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                isActive
                  ? 'bg-brand text-white border-brand shadow-sm'
                  : `${meta.tone} bg-surface border-surface-border hover:border-surface-border-hover hover:bg-surface-secondary`
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              <span>{t(categoryLabelKeys[cat])}</span>
            </button>
          );
        })}
      </div>

      {/* Courses grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((course) => {
          const c = pick(course);
          return (
            <Link key={course.id} to={`/courses/${course.id}`} className="group block">
              <Card variant="elevated" className="overflow-hidden group-hover:shadow-lg transition-shadow h-full flex flex-col">
                <CourseCover src={course.image} alt={c.title} className="aspect-video">
                  <Badge className="absolute top-3 end-3" variant="surface">
                    {c.category}
                  </Badge>
                </CourseCover>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="h4 text-text-primary group-hover:text-brand transition-colors mb-2">{c.title}</h3>
                  <p className="body-sm text-text-secondary line-clamp-2 mb-3 flex-1">{c.description}</p>
                  <div className="flex items-center gap-2 text-caption text-text-tertiary mb-3">
                    <Users className="w-4 h-4" />
                    <span>{course.students.toLocaleString()}</span>
                    <Star className="w-4 h-4 text-warning fill-current" />
                    <span>{course.rating}</span>
                    <Clock className="w-4 h-4" />
                    <span>{c.duration}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">{course.completedLessons}/{course.totalLessons} {t('lessons')}</span>
                      <span className="text-text-primary font-medium">{Math.round(course.progress * 100)}%</span>
                    </div>
                    <ProgressBar value={course.progress * 100} variant="brand" size="sm" />
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
