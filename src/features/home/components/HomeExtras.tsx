import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, ChevronDown } from 'lucide-react';
import { Card } from '../../../shared/components/ui/Card';
import { SectionHeader } from '../../../shared/components/layout/Section';
import { cn } from '../../../shared/lib/utils';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Testimonials — star-rated reviews from the community
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
interface Testimonial {
  name: string;
  role: string;
  text: string;
  rating: number;
}

const AVATARS = ['/avatars/student.svg', '/avatars/instructor-2.svg', '/avatars/instructor-1.svg'];

export function Testimonials() {
  const { t } = useTranslation('home');
  const items = t('testimonials.items', { returnObjects: true }) as Testimonial[];

  return (
    <section className="py-16 lg:py-20 bg-surface-secondary border-y border-surface-border">
      <div className="max-w-[1240px] mx-auto px-6 lg:px-8">
        <SectionHeader title={t('testimonials.title')} subtitle={t('testimonials.subtitle')} centered />
        <div className="grid md:grid-cols-3 gap-6 stagger">
          {items.map((item, i) => (
            <Card key={item.name} variant="elevated" padding="lg" className="card-lift flex flex-col">
              <div className="flex items-center gap-1 mb-4" role="img" aria-label={`${item.rating}/5`}>
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star
                    key={s}
                    className={cn(
                      'w-4 h-4',
                      s < item.rating ? 'text-accent fill-current' : 'text-surface-border'
                    )}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <blockquote className="body-sm text-text-secondary leading-relaxed flex-1">
                &ldquo;{item.text}&rdquo;
              </blockquote>
              <div className="flex items-center gap-3 mt-5 pt-5 border-t border-surface-border">
                <img
                  src={AVATARS[i % AVATARS.length]}
                  alt=""
                  className="w-10 h-10 rounded-full bg-surface-secondary object-cover"
                  loading="lazy"
                />
                <div>
                  <p className="text-sm font-semibold text-text-primary">{item.name}</p>
                  <p className="text-caption text-text-tertiary">{item.role}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   FAQ — accessible accordion
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
interface FaqItem {
  q: string;
  a: string;
}

export function Faq() {
  const { t } = useTranslation('home');
  const items = t('faq.items', { returnObjects: true }) as FaqItem[];
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-16 lg:py-20 bg-surface">
      <div className="max-w-[760px] mx-auto px-6 lg:px-8">
        <SectionHeader title={t('faq.title')} subtitle={t('faq.subtitle')} centered />
        <div className="space-y-3">
          {items.map((item, i) => {
            const open = openIndex === i;
            return (
              <Card key={item.q} variant="elevated" padding="none" className="overflow-hidden">
                <h3>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-start hover:bg-surface-secondary/60 transition-colors"
                    aria-expanded={open}
                    aria-controls={`faq-panel-${i}`}
                    id={`faq-button-${i}`}
                    onClick={() => setOpenIndex(open ? null : i)}
                  >
                    <span className="text-body font-semibold text-text-primary">{item.q}</span>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 text-text-tertiary flex-shrink-0 transition-transform duration-200',
                        open && 'rotate-180 text-brand'
                      )}
                      aria-hidden="true"
                    />
                  </button>
                </h3>
                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-button-${i}`}
                  hidden={!open}
                  className="px-5 pb-4 -mt-1"
                >
                  <p className="body-sm text-text-secondary leading-relaxed">{item.a}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
