import type { UserRole } from '../../../app/router';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, BookOpen, BrainCircuit, CalendarClock, TrendingUp, Search, Bell,
  Mic, MessagesSquare, GraduationCap, Network, Trophy, Timer, Sparkles, HeartHandshake,
  ClipboardCheck, Users, FileText, BarChart3,
  Building2, CreditCard, ScrollText, ShieldAlert, KeyRound, Activity,
  Crown, Shield, ShieldCheck, Settings, LayoutGrid,
} from 'lucide-react';

/**
 * Single source of truth for role-aware navigation.
 * Consumed by the desktop Sidebar, the mobile drawer and the in-page SectionTabs,
 * so every surface stays in sync and no nav item can point to a missing route.
 */
export type NavTone = 'brand' | 'ai' | 'warning';

export interface NavItemDef {
  id: string;
  /** i18n key in the `common` namespace. */
  labelKey: string;
  icon: LucideIcon;
  path: string;
  tone?: NavTone;
  /** Match only this exact path (otherwise prefix matching applies). */
  end?: boolean;
}

export interface NavGroupDef {
  labelKey: string;
  items: NavItemDef[];
}

const student: NavGroupDef[] = [
  { labelKey: 'nav.overview', items: [
    { id: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, path: '/dashboard', end: true },
    { id: 'courses', labelKey: 'nav.courses', icon: BookOpen, path: '/courses' },
  ] },
  { labelKey: 'nav.learn', items: [
    { id: 'ai-tutor', labelKey: 'nav.aiTutor', icon: BrainCircuit, path: '/ai-tutor', tone: 'ai' },
    { id: 'hub', labelKey: 'nav.hub', icon: LayoutGrid, path: '/hub', tone: 'ai' },
    { id: 'voice', labelKey: 'nav.voice', icon: Mic, path: '/voice', tone: 'ai' },
    { id: 'ask', labelKey: 'nav.ask', icon: Search, path: '/ask', tone: 'ai' },
    { id: 'studio', labelKey: 'nav.studio', icon: MessagesSquare, path: '/studio', tone: 'ai' },
    { id: 'adaptive', labelKey: 'nav.adaptive', icon: GraduationCap, path: '/adaptive' },
    { id: 'paths', labelKey: 'nav.paths', icon: Network, path: '/paths' },
    { id: 'planner', labelKey: 'nav.planner', icon: CalendarClock, path: '/planner' },
    { id: 'progress', labelKey: 'nav.progress', icon: TrendingUp, path: '/progress' },
  ] },
  { labelKey: 'nav.tools', items: [
    { id: 'search', labelKey: 'nav.search', icon: Search, path: '/search' },
    { id: 'compete', labelKey: 'nav.compete', icon: Trophy, path: '/compete' },
    { id: 'focus', labelKey: 'nav.focus', icon: Timer, path: '/focus' },
    { id: 'achieve', labelKey: 'nav.achieve', icon: Sparkles, path: '/achieve' },
    { id: 'care', labelKey: 'nav.care', icon: HeartHandshake, path: '/care' },
    { id: 'notifications', labelKey: 'nav.notifications', icon: Bell, path: '/notifications' },
  ] },
];

const teacher: NavGroupDef[] = [
  { labelKey: 'nav.overview', items: [
    { id: 'teacher-dashboard', labelKey: 'nav.teacher', icon: LayoutDashboard, path: '/teacher', end: true },
    { id: 'teacher-classes', labelKey: 'nav.classes', icon: Users, path: '/teacher/classes' },
  ] },
  { labelKey: 'nav.manage', items: [
    { id: 'teacher-assignments', labelKey: 'nav.assignments', icon: ClipboardCheck, path: '/teacher/assignments' },
    { id: 'teacher-exams', labelKey: 'nav.exams', icon: FileText, path: '/teacher/exams' },
  ] },
  { labelKey: 'nav.insights', items: [
    { id: 'teacher-students', labelKey: 'nav.students', icon: GraduationCap, path: '/teacher/students' },
    { id: 'teacher-analytics', labelKey: 'nav.analytics', icon: BarChart3, path: '/teacher/analytics' },
  ] },
];

const admin: NavGroupDef[] = [
  { labelKey: 'nav.overview', items: [
    { id: 'admin-overview', labelKey: 'nav.admin', icon: LayoutDashboard, path: '/admin', end: true },
  ] },
  { labelKey: 'nav.manage', items: [
    { id: 'admin-users', labelKey: 'nav.users', icon: Users, path: '/admin/users' },
    { id: 'admin-organizations', labelKey: 'nav.adminSub.organizations', icon: Building2, path: '/admin/organizations' },
    { id: 'admin-content', labelKey: 'nav.content', icon: BookOpen, path: '/admin/content' },
  ] },
  { labelKey: 'nav.tools', items: [
    { id: 'admin-ai-usage', labelKey: 'nav.adminSub.aiUsage', icon: BrainCircuit, path: '/admin/ai-usage', tone: 'ai' },
    { id: 'admin-ai-costs', labelKey: 'nav.adminSub.aiCosts', icon: CreditCard, path: '/admin/ai-costs' },
  ] },
  { labelKey: 'nav.security', items: [
    { id: 'admin-audit-logs', labelKey: 'nav.adminSub.auditLogs', icon: ScrollText, path: '/admin/audit-logs' },
    { id: 'admin-security-events', labelKey: 'nav.adminSub.securityEvents', icon: ShieldAlert, path: '/admin/security-events' },
    { id: 'admin-permissions', labelKey: 'nav.adminSub.permissions', icon: KeyRound, path: '/admin/permissions' },
  ] },
  { labelKey: 'nav.system', items: [
    { id: 'admin-system-health', labelKey: 'nav.adminSub.systemHealth', icon: Activity, path: '/admin/system-health' },
  ] },
];

const owner: NavGroupDef[] = [
  { labelKey: 'nav.overview', items: [
    { id: 'owner-dashboard', labelKey: 'nav.owner.dashboard', icon: Crown, path: '/owner', end: true, tone: 'warning' },
  ] },
  { labelKey: 'nav.manage', items: [
    { id: 'owner-access', labelKey: 'nav.owner.access', icon: Users, path: '/owner/access' },
    { id: 'owner-roles', labelKey: 'nav.owner.roles', icon: Shield, path: '/owner/roles' },
    { id: 'owner-permissions', labelKey: 'nav.owner.permissions', icon: KeyRound, path: '/owner/permissions' },
  ] },
  { labelKey: 'nav.security', items: [
    { id: 'owner-security', labelKey: 'nav.owner.security', icon: ShieldCheck, path: '/owner/security' },
    { id: 'owner-audit', labelKey: 'nav.owner.audit', icon: ScrollText, path: '/owner/audit' },
  ] },
  { labelKey: 'nav.system', items: [
    { id: 'owner-settings', labelKey: 'nav.owner.platformSettings', icon: Settings, path: '/owner/settings' },
  ] },
];

export const navGroupsByRole: Record<UserRole, NavGroupDef[]> = { student, teacher, admin, owner };

/** Bottom (mobile) bar — the 5 primary destinations per role. */
export const mobileNavByRole: Record<UserRole, NavItemDef[]> = {
  student: student.flatMap((g) => g.items).filter((i) => ['dashboard', 'courses', 'ai-tutor', 'hub', 'search'].includes(i.id)),
  teacher: [
    teacher[0].items[0], teacher[0].items[1], teacher[1].items[0], teacher[1].items[1], teacher[2].items[0],
  ],
  admin: [
    admin[0].items[0], admin[1].items[0], admin[1].items[2], admin[3].items[0], admin[4].items[0],
  ],
  owner: [
    owner[0].items[0], owner[1].items[0], owner[1].items[1], owner[2].items[0], owner[3].items[0],
  ],
};

/** Footer items shared by every role. */
export const footerNav: NavItemDef[] = [
  { id: 'settings', labelKey: 'nav.settings', icon: Settings, path: '/settings' },
  { id: 'profile', labelKey: 'nav.profile', icon: Users, path: '/profile' },
];

export function flattenNav(groups: NavGroupDef[]): NavItemDef[] {
  return groups.flatMap((g) => g.items);
}

/** Flat lists for in-page section tab strips (Teacher / Admin / Owner pages). */
export const studentNav = flattenNav(student);
export const teacherNav = flattenNav(teacher);
export const adminNav = flattenNav(admin);
export const ownerNav = flattenNav(owner);

