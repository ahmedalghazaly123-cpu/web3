import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { initMockAuth } from '../shared/lib/mockAuth';

initMockAuth();

// ━━━─ Locale modules ━━━─
import { common as enCommon } from './locales/en/common';
import { auth as enAuth } from './locales/en/auth';
import { home as enHome } from './locales/en/home';
import { dashboard as enDashboard } from './locales/en/dashboard';
import { courses as enCourses } from './locales/en/courses';
import { aiTutor as enAiTutor } from './locales/en/ai-tutor';
import { planner as enPlanner } from './locales/en/planner';
import { assessment as enAssessment } from './locales/en/assessment';
import { teacher as enTeacher } from './locales/en/teacher';
import { admin as enAdmin } from './locales/en/admin';
import { settings as enSettings } from './locales/en/settings';
import { profile as enProfile } from './locales/en/profile';
import { owner as enOwner } from './locales/en/owner';
import { progress as enProgress } from './locales/en/progress';
import { notifications as enNotifications } from './locales/en/notifications';
import { hub as enHub } from './locales/en/hub';

import { common as arCommon } from './locales/ar/common';
import { auth as arAuth } from './locales/ar/auth';
import { home as arHome } from './locales/ar/home';
import { dashboard as arDashboard } from './locales/ar/dashboard';
import { courses as arCourses } from './locales/ar/courses';
import { aiTutor as arAiTutor } from './locales/ar/ai-tutor';
import { planner as arPlanner } from './locales/ar/planner';
import { assessment as arAssessment } from './locales/ar/assessment';
import { teacher as arTeacher } from './locales/ar/teacher';
import { admin as arAdmin } from './locales/ar/admin';
import { settings as arSettings } from './locales/ar/settings';
import { profile as arProfile } from './locales/ar/profile';
import { owner as arOwner } from './locales/ar/owner';
import { progress as arProgress } from './locales/ar/progress';
import { notifications as arNotifications } from './locales/ar/notifications';
import { hub as arHub } from './locales/ar/hub';

export type Language = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

export const isRtl = (lng: Language): boolean => lng === 'ar';
export const getDirection = (lng: Language | string): Direction =>
  isRtl(lng as Language) ? 'rtl' : 'ltr';

export const languages: { code: Language; label: string; dir: Direction }[] = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
];

const namespaces = [
  'common', 'auth', 'home', 'dashboard', 'courses',
  'ai-tutor', 'planner', 'assessment', 'teacher', 'admin', 'settings', 'profile', 'owner', 'progress',
  'notifications', 'hub',
];
export const namespaceList = namespaces;
export const defaultNS = 'common';

const savedLanguage = localStorage.getItem('language') as Language | null;
const browserLanguage =
  savedLanguage ??
  (isRtl(navigator.language as Language) ? 'ar' : 'en');

i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon, auth: enAuth, home: enHome, dashboard: enDashboard,
      courses: enCourses, 'ai-tutor': enAiTutor, planner: enPlanner,
      assessment: enAssessment, teacher: enTeacher, admin: enAdmin,
      settings: enSettings, profile: enProfile, owner: enOwner, progress: enProgress,
      notifications: enNotifications, hub: enHub,
    },
    ar: {
      common: arCommon, auth: arAuth, home: arHome, dashboard: arDashboard,
      courses: arCourses, 'ai-tutor': arAiTutor, planner: arPlanner,
      assessment: arAssessment, teacher: arTeacher, admin: arAdmin,
      settings: arSettings, profile: arProfile, owner: arOwner, progress: arProgress,
      notifications: arNotifications, hub: arHub,
    },
  },
  lng: browserLanguage,
  fallbackLng: 'en',
  ns: namespaces,
  defaultNS,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
  saveMissing: true,
});

export default i18n;
