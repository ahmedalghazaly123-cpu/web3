// Phase 24-25: gamification (meaningful rewards) + focus/attention (privacy-first).
import type { EntityId } from '../domain';
import { store } from '../services/store.ts';

export function awardMeaningfulXp(studentId: EntityId, kind: 'correct' | 'review' | 'streak' | 'mastery', nowIso: string): number {
  const xp = kind === 'mastery' ? 50 : kind === 'correct' ? 10 : kind === 'review' ? 8 : 5;
  const prev = store.level.get(studentId);
  const total = (prev?.xp ?? 0) + xp;
  const level = Math.floor(Math.sqrt(total / 100)) + 1;
  store.level.save({
    studentId, xp: total, level, xpToNext: level * level * 100 - total,
    streak: prev?.streak ?? 1, longestStreak: prev?.longestStreak ?? 1, lastActiveAt: nowIso,
  });
  return total;
}

export function focusSummary(studentId: EntityId): { sessions: number; minutes: number; interruptions: number } {
  const sessions = store.sessions.listByStudent(studentId);
  return {
    sessions: sessions.length,
    minutes: sessions.reduce((s, x) => s + (x.actualMinutes ?? x.intendedMinutes), 0),
    interruptions: sessions.reduce((s, x) => s + (x.interruptCount ?? 0), 0),
  };
}

export const engagementEngine = { awardMeaningfulXp, focusSummary };
