// Phase 24-25: gamification (meaningful rewards) + focus/attention (privacy-first).
// Canonical XP pathway: frontend engagement -> api.learning.awardXp -> backend
// xpService -> atomic transaction (XpEvent + StudentLevel update).
// Idempotency is enforced server-side via unique (studentId, clientKey).
// Local idempotency is also tracked in memory for offline resilience.
import type { EntityId } from '../domain';
import { store } from '../services/store.ts';
import { api } from '../services/api.ts';

function nowIso(): string { return new Date().toISOString(); }

export interface XpResult {
  xp: number;
  level: number;
  xpToNext: number;
  awarded: boolean;
  previousXp: number;
  previousLevel: number;
}

const XP_VALUES: Record<'correct' | 'review' | 'streak' | 'mastery' | 'achievement', { amount: number; kind: string; source: string }> = {
  correct: { amount: 10, kind: 'CORRECT_ANSWER', source: 'student' },
  review: { amount: 8, kind: 'REVIEW', source: 'spaced-repetition' },
  streak: { amount: 5, kind: 'STREAK', source: 'system' },
  mastery: { amount: 50, kind: 'MASTERY', source: 'student' },
  achievement: { amount: 25, kind: 'ACHIEVEMENT', source: 'system' },
};

// Local idempotency set — prevents double-counting on the client even when
// the backend is unreachable. The backend remains the authoritative source.
export const awardedKeys = new Set<string>();

export function resetIdempotency(): void {
  awardedKeys.clear();
}

export async function awardMeaningfulXp(
  studentId: EntityId,
  kind: 'correct' | 'review' | 'streak' | 'mastery' | 'achievement',
  nowIsoOverride?: string,
  clientKey?: string
): Promise<XpResult> {
  const ts = nowIsoOverride ?? nowIso();
  const cfg = XP_VALUES[kind];
  const key = clientKey ?? `${studentId}:${kind}:${ts.slice(0, 13)}`;

  // Local idempotency check (offline resilience): if this exact clientKey
  // has already been applied for this student, do not double-count locally.
  if (awardedKeys.has(key)) {
    const prev = store.level.get(studentId);
    return {
      xp: prev?.xp ?? 0,
      level: prev?.level ?? 1,
      xpToNext: prev?.xpToNext ?? 100,
      awarded: false,
      previousXp: prev?.xp ?? 0,
      previousLevel: prev?.level ?? 1,
    };
  }

  // Local optimistic update (non-authoritative; backend is source of truth)
  const prev = store.level.get(studentId);
  const optimisticTotal = (prev?.xp ?? 0) + cfg.amount;
  const optimisticLevel = Math.floor(Math.sqrt(optimisticTotal / 100)) + 1;
  store.level.save({
    studentId, xp: optimisticTotal, level: optimisticLevel,
    xpToNext: optimisticLevel * optimisticLevel * 100 - optimisticTotal,
    streak: prev?.streak ?? 1, longestStreak: prev?.longestStreak ?? 1, lastActiveAt: ts,
  });
  awardedKeys.add(key);

  // Authoritative backend award (idempotent, atomic, concurrency-safe)
  try {
    const result = await api.learning.awardXp({
      kind: cfg.kind,
      amount: cfg.amount,
      source: cfg.source,
      clientKey: key,
      happenedAt: ts,
    });
    if (result && typeof result.xp === 'number') {
      store.level.save({
        studentId, xp: result.xp, level: result.level,
        xpToNext: result.xpToNext,
        streak: prev?.streak ?? 1, longestStreak: prev?.longestStreak ?? 1, lastActiveAt: ts,
      });
      return result as XpResult;
    }
  } catch {
    /* backend unavailable — optimistic local state remains */
  }

  return {
    xp: optimisticTotal,
    level: optimisticLevel,
    xpToNext: optimisticLevel * optimisticLevel * 100 - optimisticTotal,
    awarded: true,
    previousXp: prev?.xp ?? 0,
    previousLevel: prev?.level ?? 1,
  };
}

export function focusSummary(studentId: EntityId): { sessions: number; minutes: number; interruptions: number } {
  const sessions = store.sessions.listByStudent(studentId);
  return {
    sessions: sessions.length,
    minutes: sessions.reduce((s, x) => s + (x.actualMinutes ?? x.intendedMinutes), 0),
    interruptions: sessions.reduce((s, x) => s + (x.interruptCount ?? 0), 0),
  };
}

export const engagementEngine = { awardMeaningfulXp, focusSummary, resetIdempotency };