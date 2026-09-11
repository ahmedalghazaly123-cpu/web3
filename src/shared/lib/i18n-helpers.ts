import { useTranslation } from 'react-i18next';
import type { Course } from '../types';

/**
 * useLocalized — picks the right language variant for data objects.
 * Falls back to English fields when an Arabic variant is missing.
 */
export function useLocalized() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';

  const pick = (course: Course) => ({
    title: (lang === 'ar' && course.titleAr) || course.title,
    description: (lang === 'ar' && course.descriptionAr) || course.description,
    category: (lang === 'ar' && course.categoryAr) || course.category,
    instructor: (lang === 'ar' && course.instructorAr) || course.instructor,
    duration: (lang === 'ar' && course.durationAr) || course.duration,
  });

  return { lang, isRTL: lang === 'ar', pick };
}
