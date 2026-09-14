import { Routes, Route, Outlet, Navigate } from 'react-router-dom';

// Public pages
import HomePage from '@features/home/pages/Home';
import AccountTypePage from '@features/auth/pages/AccountType';
import LoginRoute from '@features/auth/pages/LoginRoute';
import GoogleCallback from '@features/auth/pages/GoogleCallback';

// Student pages
import StudentDashboard from '@features/student/pages/Dashboard';
import CoursesPage from '@features/student/pages/Courses';
import CoursePage from '@features/student/pages/Course';
import LessonPage from '@features/student/pages/Lesson';
import AITutor from '@features/ai-tutor/pages/AITutor';
import HubPage from '@features/hub/pages/Hub';
import AdaptivePage from '@features/hub/pages/Adaptive';
import VoicePage from '@features/hub/pages/Voice';
import AskPage from '@features/hub/pages/Ask';
import StudioPage from '@features/hub/pages/Studio';
import PathsPage from '@features/hub/pages/Paths';
import CompetePage from '@features/hub/pages/Compete';
import FocusPage from '@features/hub/pages/Focus';
import AchievePage from '@features/hub/pages/Achieve';
import CarePage from '@features/hub/pages/Care';
import Planner from '@features/planner/pages/Planner';
import QuizPage from '@features/assessment/pages/Quiz';
import ExamPage from '@features/assessment/pages/Exam';
import ResultsPage from '@features/assessment/pages/Results';
import ProgressPage from '@features/student/pages/Progress';
import SearchPage from '@features/search/pages/Search';
import NotificationsPage from '@features/notifications/pages/Notifications';

// Teacher pages
import TeacherDashboard from '@features/teacher/pages/TeacherDashboard';
import TeacherClasses from '@features/teacher/pages/TeacherClasses';
import TeacherAssignments from '@features/teacher/pages/TeacherAssignments';
import TeacherExams from '@features/teacher/pages/TeacherExams';
import TeacherStudents from '@features/teacher/pages/TeacherStudents';
import TeacherAnalytics from '@features/teacher/pages/TeacherAnalytics';

// Admin pages
import AdminDashboard from '@features/admin/pages/AdminDashboard';
import AdminUsers from '@features/admin/pages/AdminUsers';
import AdminOrganizations from '@features/admin/pages/AdminOrganizations';
import AdminContent from '@features/admin/pages/AdminContent';
import AdminAI from '@features/admin/pages/AdminAI';
import AdminAudit from '@features/admin/pages/AdminAudit';
import AdminSecurity from '@features/admin/pages/AdminSecurity';
import AdminPermissions from '@features/admin/pages/AdminPermissions';
import AdminHealth from '@features/admin/pages/AdminHealth';

// Owner / Super Admin pages
import OwnerDashboard from '@features/owner/pages/OwnerDashboard';
import OwnerAccess from '@features/owner/pages/OwnerAccess';
import OwnerRoles from '@features/owner/pages/OwnerRoles';
import OwnerPermissions from '@features/owner/pages/OwnerPermissions';
import OwnerSecurity from '@features/owner/pages/OwnerSecurity';
import OwnerAudit from '@features/owner/pages/OwnerAudit';
import OwnerSettings from '@features/owner/pages/OwnerSettings';

// Shared pages
import SettingsPage from '@features/settings/pages/Settings';
import ProfilePage from '@features/profile/pages/Profile';
import NotFound from '@features/shared/pages/NotFound';

import { RequireAuth, RequireRole } from './app/layout/AuthProviders';
import { DesktopShell } from './app/layout/DesktopShell';
import { ToastProvider } from './shared/components/ui/ToastProvider';

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* Pre-login entry: choose account type, then role-specific login */}
        <Route path="/account-type" element={<AccountTypePage />} />
        <Route path="/login/:role" element={<LoginRoute />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
        {/* Legacy aliases — redirect into the new flow (no direct /login) */}
        <Route path="/login" element={<Navigate to="/account-type" replace />} />
        <Route path="/register" element={<Navigate to="/account-type" replace />} />

        <Route element={<RequireAuth />}>
          <Route element={<DesktopShell><Outlet /></DesktopShell>}>
            {/* Student — fixed role, own experience */}
            <Route element={<RequireRole allowed={['student']} />}>
              <Route path="/dashboard" element={<StudentDashboard />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/:courseId" element={<CoursePage />} />
              <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonPage />} />
              <Route path="/ai-tutor" element={<AITutor />} />
              <Route path="/hub" element={<HubPage />} />
              <Route path="/voice" element={<VoicePage />} />
              <Route path="/ask" element={<AskPage />} />
              <Route path="/studio" element={<StudioPage />} />
              <Route path="/adaptive" element={<AdaptivePage />} />
              <Route path="/paths" element={<PathsPage />} />
              <Route path="/compete" element={<CompetePage />} />
              <Route path="/focus" element={<FocusPage />} />
              <Route path="/achieve" element={<AchievePage />} />
              <Route path="/care" element={<CarePage />} />
              <Route path="/planner" element={<Planner />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/assessment/:assessmentId" element={<QuizPage />} />
              <Route path="/assessment/:assessmentId/exam" element={<ExamPage />} />
              <Route path="/results/:assessmentId" element={<ResultsPage />} />
            </Route>

            {/* Shared (all authenticated roles) */}
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/* Teacher — fixed role, own experience */}
            <Route element={<RequireRole allowed={['teacher']} />}>
              <Route path="/teacher" element={<TeacherDashboard />} />
              <Route path="/teacher/classes" element={<TeacherClasses />} />
              <Route path="/teacher/assignments" element={<TeacherAssignments />} />
              <Route path="/teacher/exams" element={<TeacherExams />} />
              <Route path="/teacher/students" element={<TeacherStudents />} />
              <Route path="/teacher/analytics" element={<TeacherAnalytics />} />
            </Route>

            {/* Admin — fixed role, distinct from Owner */}
            <Route element={<RequireRole allowed={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/organizations" element={<AdminOrganizations />} />
              <Route path="/admin/content" element={<AdminContent />} />
              <Route path="/admin/ai-usage" element={<AdminAI />} />
              <Route path="/admin/ai-costs" element={<AdminAI initialTab="costs" />} />
              <Route path="/admin/audit-logs" element={<AdminAudit />} />
              <Route path="/admin/security-events" element={<AdminSecurity />} />
              <Route path="/admin/permissions" element={<AdminPermissions />} />
              <Route path="/admin/system-health" element={<AdminHealth />} />
            </Route>

            {/* Owner / Super Admin — fixed role, distinct from Admin */}
            <Route element={<RequireRole allowed={['owner']} />}>
              <Route path="/owner" element={<OwnerDashboard />} />
              <Route path="/owner/access" element={<OwnerAccess />} />
              <Route path="/owner/roles" element={<OwnerRoles />} />
              <Route path="/owner/permissions" element={<OwnerPermissions />} />
              <Route path="/owner/security" element={<OwnerSecurity />} />
              <Route path="/owner/audit" element={<OwnerAudit />} />
              <Route path="/owner/settings" element={<OwnerSettings />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
