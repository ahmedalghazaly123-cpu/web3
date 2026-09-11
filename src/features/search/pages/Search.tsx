import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { CourseCover } from '../../../shared/components/ui/CourseCover';
import { courses } from '../../../data';
import type { Course } from '../../../shared/types';
import { useLocalized } from '../../../shared/lib/i18n-helpers';
import { Search, Clock, BookOpen, Users, Star, Sparkles, SearchX } from 'lucide-react';

export default function SearchPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [recentSearches] = useState(['Limits', 'Derivatives', 'Linear Algebra', 'Chain Rule']);

  const results = courses.filter((c) => {
    const q = query.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      (c.titleAr ?? '').includes(query) ||
      c.description.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-8 page-enter">
      <h1 className="display-sm text-text-primary">{t('nav.search')}</h1>

      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
        <input
          type="search"
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full ps-10 pe-4 h-12 text-lg bg-surface border border-surface-border rounded-xl focus:outline-none focus:border-brand transition-colors"
        />
      </div>

      {!query && (
        <div>
          <h2 className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-3">
            {t('search.recentSearches')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((term) => (
              <button
                key={term}
                onClick={() => setQuery(term)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-surface border border-surface-border text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors"
              >
                <Clock className="w-3 h-3" />
                <span>{term}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {query && (
        results.length > 0 ? (
          <div className="space-y-4">
            <h2 className="h3 text-text-primary">
              {t('search.resultsFor', { count: results.length, query })}
            </h2>
            {results.map((course) => (
              <SearchResultItem key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<SearchX />}
            tone="neutral"
            title={t('search.noResults')}
            description={t('search.noResultsDesc')}
            illustration="/illustrations/empty-search.svg"
            className="py-16"
          />
        )
      )}
    </div>
  );
}

function SearchResultItem({ course }: { course: Course }) {
  const { pick } = useLocalized();
  const c = pick(course);
  return (
    <Link to={`/courses/${course.id}`} className="block group">
      <Card variant="elevated" padding="md" className="group-hover:border-surface-border-hover transition-colors">
        <div className="flex gap-4">
          <CourseCover src={course.image} alt={c.title} className="w-16 h-16 rounded-lg flex-shrink-0" overlay={false}>
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white/80" />
            </div>
          </CourseCover>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="h4 text-text-primary">{c.title}</h3>
              <Badge variant="primary" size="xs">{c.category}</Badge>
            </div>
            <p className="body-sm text-text-secondary line-clamp-2 mt-1">{c.description}</p>
            <div className="flex items-center gap-4 text-caption text-text-tertiary mt-2">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{course.students.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-accent fill-current" />
                <span>{course.rating}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{c.duration}</span>
              </div>
              <Sparkles className="w-4 h-4 text-ai ms-auto" />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
