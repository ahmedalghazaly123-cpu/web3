// ━━━─ Shared TypeScript Types ━━━─

export type ID = string | number;

export interface User {
  id: ID;
  name: string;
  email: string;
  avatar: string;
  role: 'student' | 'teacher' | 'admin' | 'owner';
  language: 'en' | 'ar';
  theme: 'light' | 'dark' | 'system';
}

export interface Course {
  id: ID;
  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;
  instructor: string;
  instructorAr?: string;
  instructorAvatar: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  duration: string;
  durationAr?: string;
  students: number;
  rating: number;
  image: string;
  color: string;
  category: string;
  categoryAr?: string;
}
export interface Lesson {
  id: ID;
  title: string;
  description: string;
  type: 'video' | 'text' | 'pdf' | 'interactive';
  duration: number;
  completed: boolean;
  locked: boolean;
  current?: boolean;
}

export interface Section {
  id: ID;
  title: string;
  lessons: Lesson[];
}

export interface QuizQuestion {
  id: ID;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  topic: string;
}

export interface Quiz {
  id: ID;
  title: string;
  questions: QuizQuestion[];
  timeLimit?: number;
  passingScore: number;
}

export interface ProgressData {
  courseId: ID;
  completion: number;
  topicMastery: { topic: string; level: number }[];
  weeklyActivity: { day: string; hours: number }[];
  studyTime: number;
  examReadiness: number;
  streak: number;
  level: number;
  xp: number;
}

export interface StudySession {
  id: ID;
  title: string;
  topic: string;
  startTime: Date;
  endTime: Date;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  estimatedDuration: number;
}

export interface NotificationItem {
  id: ID;
  title: string;
  message: string;
  category: 'learning' | 'system' | 'ai' | 'assessment';
  read: boolean;
  timestamp: Date;
  action?: string;
}

export interface AIMessage {
  id: ID;
  role: 'ai' | 'user';
  content: string;
  timestamp: Date;
  structured?: boolean;
  citations?: string[];
}

export interface Theme {
  mode: 'light' | 'dark' | 'system';
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
  section: 'primary' | 'secondary' | 'settings' | 'security' | 'system';
}

export type Status = 'idle' | 'loading' | 'success' | 'error';
export type Priority = 'high' | 'medium' | 'low';


