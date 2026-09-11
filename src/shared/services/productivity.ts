// ━━━ Productivity — exam sim, gamification, focus, bookmarks, attention ━━━
import type { EntityId, BookmarkTarget, StudentLevel } from '../domain';
import { store } from './store.ts';

function nowIso(): string { return new Date().toISOString(); }

/**
 * Day-boundary streak rule (shared by awardXp and bumpStreak):
 * - no previous activity          → streak initializes to 1
 * - activity same calendar day    → streak keeps its value (min 1)
 * - activity yesterday (consecutive day) → streak + 1
 * - activity older than yesterday (missed day) → streak resets to 1
 */
function computeStreak(prev: StudentLevel | undefined): number {
  if (!prev?.lastActiveAt) return 1;
  const last = new Date(prev.lastActiveAt);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfLastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate()).getTime();
  const dayDiffMs = startOfToday - startOfLastDay;
  const oneDayMs = 24 * 60 * 60 * 1000;
  if (dayDiffMs <= 0) return Math.max(1, prev.streak ?? 0); // same day
  if (dayDiffMs <= oneDayMs) return (prev.streak ?? 0) + 1; // consecutive day
  return 1; // missed day → reset
}

export const productivity = {
  buildExam(courseId: EntityId, minutes = 20) {
    return store.assessments.save({
      id: `exam-${Date.now()}`, type: 'exam', courseId,
      title: 'Simulated Exam', titleAr: 'امتحان تجريبي',
      questionIds: [], timeLimitSeconds: minutes * 60, passingScore: 60,
      adaptive: false, template: 'mock-exam',
    });
  },

  awardXp(studentId: EntityId, xp: number, _reason: string) {
    const prev = store.level.get(studentId);
    const total = (prev?.xp ?? 0) + xp;
    const level = Math.floor(Math.sqrt(total / 100)) + 1;
    // BUG 1 fix: compute streak from the PREVIOUS stored activity date
    // (before we overwrite lastActiveAt), using the shared day-boundary rule.
    const streak = computeStreak(prev);
    const cur = {
      studentId, xp: total, level,
      xpToNext: level * level * 100 - total,
      streak, longestStreak: Math.max(prev?.longestStreak ?? 0, streak),
      lastActiveAt: nowIso(),
    };
    store.level.save(cur);
    return cur;
  },

  bumpStreak(studentId: EntityId) {
    const prev = store.level.get(studentId);
    const streak = computeStreak(prev);
    const cur = {
      studentId, xp: prev?.xp ?? 0, level: prev?.level ?? 1, xpToNext: prev?.xpToNext ?? 100,
      streak, longestStreak: Math.max(prev?.longestStreak ?? 0, streak), lastActiveAt: nowIso(),
    };
    store.level.save(cur);
    return streak;
  },

  focusSession(studentId: EntityId, minutes: number, goal?: string) {
    const session = {
      id: store.uid(), studentId, startedAt: nowIso(),
      endedAt: new Date(Date.now() + minutes * 6e4).toISOString(),
      intendedMinutes: minutes, actualMinutes: minutes,
      topic: goal ?? 'Focus session', completed: false,
    };
    store.sessions.save(session);
    return session;
  },

  bookmark(studentId: EntityId, kind: BookmarkTarget, refId: string, note?: string) {
    const bm = {
      id: store.uid(), studentId, targetType: kind, targetId: refId,
      excerpt: note, tags: [], createdAt: nowIso(),
    };
    store.bookmarks.save(bm);
    return bm;
  },

  logAttention(studentId: EntityId, signals: { responseTimeMs?: number; inactiveMs?: number; mistakes?: number; rapidGuesses?: number; sessionMinutes?: number }) {
    const score = Math.max(0, Math.min(100, 100 - (signals.rapidGuesses ?? 0) * 10 - (signals.mistakes ?? 0) * 5));
    const snap = {
      id: store.uid(), studentId,
      signals: {
        responseTime: signals.responseTimeMs, inactivity: signals.inactiveMs,
        rapidGuessing: signals.rapidGuesses, repeatedMistake: signals.mistakes,
        sessionDuration: signals.sessionMinutes,
      },
      sampledAt: nowIso(), needsAttention: score < 60,
      note: `focus-score:${score}`,
    };
    store.attention.save(snap);
    return snap;
  },
};
