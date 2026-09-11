// ━━━─ Learning Data Sync Adapter ━━━─
// Clean domain bridge between the deterministic LearnPilot intelligence engines
// (which compute against @shared/services/store — the local cache) and the
// authoritative Backend → PostgreSQL persistence layer.
//
// Rule (Wave 1): engines stay pure & localStorage-testable; this adapter is the
// ONLY place that talks to api.learning.*. Frontend stores a clearly-separated
// local cache; the backend is authoritative (Rule 6).
//
// Enum mapping: frontend domain uses lowercase/hyphen (e.g. 'lesson-completed',
// 'spaced-repetition', 'concept', 'improving'); the Prisma backend expects
// uppercase enum values (LESSON_COMPLETED, SPACED_REPETITION, CONCEPT, IMPROVING).

import { api } from './api';
import { store } from './store';
import type { LearningEvent } from '../intelligence/learning-events';
import type { MasteryRecord } from '../domain';

const AUTH_TOKEN_KEY = 'lp-auth-token';

function toEnum(frontend: string): string {
  return frontend.replace(/-/g, '_').toUpperCase();
}
function fromEnum(back: string | null | undefined): string | undefined {
  return back ? back.toLowerCase().replace(/_/g, '-') : undefined;
}
function toIso(v: unknown): string | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  return undefined;
}

export interface ApiEvent {
  id?: string;
  kind: string;
  studentId: string;
  source: string;
  happenedAt: string;
  nodeId?: string;
  nodeType?: string;
  courseId?: string;
  lessonId?: string;
  questionId?: string;
  sessionId?: string;
  assessmentId?: string;
  payload?: unknown;
  clientKey?: string;
}

/** Strip null/undefined values so Zod z.string().optional() fields never receive null. */
function pruneNulls(o: Record<string, unknown>): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== null && v !== undefined) r[k] = v;
  }
  return r;
}

function toBackendEvent(e: LearningEvent): Record<string, unknown> {
  return pruneNulls({
    kind: toEnum(e.kind),
    source: toEnum(e.source),
    happenedAt: e.happenedAt,
    nodeId: e.nodeId,
    nodeType: e.nodeType ? toEnum(e.nodeType) : undefined,
    courseId: e.courseId,
    lessonId: e.lessonId,
    questionId: e.questionId,
    sessionId: e.sessionId,
    assessmentId: e.assessmentId,
    payload: e.payload,
    clientKey: e.clientKey,
  });
}

function fromBackendEvent(be: any): LearningEvent {
  return {
    id: be.id,
    studentId: be.studentId,
    kind: fromEnum(be.kind) as LearningEvent['kind'],
    source: fromEnum(be.source) as LearningEvent['source'],
    happenedAt: toIso(be.happenedAt) ?? be.happenedAt,
    nodeId: be.nodeId ?? undefined,
    nodeType: be.nodeType ? (fromEnum(be.nodeType) as LearningEvent['nodeType']) : undefined,
    courseId: be.courseId ?? undefined,
    lessonId: be.lessonId ?? undefined,
    questionId: be.questionId ?? undefined,
    sessionId: be.sessionId ?? undefined,
    assessmentId: be.assessmentId ?? undefined,
    payload: be.payload ?? undefined,
    clientKey: be.clientKey ?? undefined,
  } as LearningEvent;
}

function toBackendMastery(m: MasteryRecord): Record<string, unknown> {
  return pruneNulls({
    nodeId: m.nodeId,
    nodeType: toEnum(m.nodeType),
    mastery: m.mastery,
    dimensions: m.dimensions,
    attempts: m.attempts,
    lastPracticedAt: m.lastPracticedAt,
    nextReviewAt: m.nextReviewAt,
    confidence: m.confidence,
    trend: m.trend ? toEnum(m.trend) : undefined,
    weak: m.weak ?? false,
    mastered: m.mastered ?? false,
    lastEvidenceNote: m.lastEvidenceNote,
  });
}

function fromBackendMastery(bm: any): MasteryRecord {
  return {
    id: `mastery-${bm.studentId}-${bm.nodeId}`,
    studentId: bm.studentId,
    nodeId: bm.nodeId,
    nodeType: (fromEnum(bm.nodeType) ?? bm.nodeType ?? 'concept') as MasteryRecord['nodeType'],
    mastery: bm.mastery ?? 0,
    dimensions: bm.dimensions ?? {},
    attempts: bm.attempts ?? 0,
    lastPracticedAt: toIso(bm.lastPracticedAt) ?? new Date(0).toISOString(),
    nextReviewAt: bm.nextReviewAt ? toIso(bm.nextReviewAt) : undefined,
    confidence: bm.confidence ?? 0,
    trend: fromEnum(bm.trend) as MasteryRecord['trend'] | undefined,
    weak: bm.weak ?? false,
    mastered: bm.mastered ?? false,
    updatedAt: toIso(bm.updatedAt) ?? new Date().toISOString(),
    lastEvidenceNote: bm.lastEvidenceNote ?? undefined,
  };
}

// Tracks items already pushed in this session to avoid re-POSTing.
const syncedEvents = new Set<string>(); // clientKey | `ev:${id}`
const syncedMastery = new Set<string>(); // `${studentId}:${nodeId}`

export const learningSync = {
  /** Authoritative backend is in use when an auth token is present. */
  isBackend(): boolean {
    try {
      return typeof localStorage !== 'undefined' && !!localStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return false;
    }
  },

  /** Persist a learning event: local cache + authoritative backend (idempotent via clientKey). */
  recordEvent(event: LearningEvent): void {
    store.events.append(event as any);
    if (!this.isBackend()) return;
    void api.learning.recordEvent(toBackendEvent(event)).catch(() => {
      /* offline / backend unavailable — local cache remains authoritative until next sync */
    });
    if (event.clientKey) syncedEvents.add(event.clientKey);
  },

  /** Persist a mastery record: local cache + authoritative backend (upsert by studentId+nodeId). */
  upsertMastery(record: MasteryRecord): void {
    store.mastery.save(record);
    if (!this.isBackend()) return;
    void api.learning.upsertMastery(toBackendMastery(record)).catch(() => {
      /* best-effort; local cache remains */
    });
    syncedMastery.add(`${record.studentId}:${record.nodeId}`);
  },

  /** Flush any store mutations made by engines directly (e.g. masteryEngine.ingestEvidence). */
  flush(studentId: string): void {
    if (!this.isBackend()) return;
    for (const e of store.events.listByStudent(studentId)) {
      const key = (e.clientKey as string | undefined) ?? `ev:${e.id}`;
      if (syncedEvents.has(key)) continue;
      void api.learning.recordEvent(toBackendEvent(e as unknown as LearningEvent)).catch(() => {});
      syncedEvents.add(key);
    }
    for (const m of store.mastery.listByStudent(studentId)) {
      const key = `${m.studentId}:${m.nodeId}`;
      if (syncedMastery.has(key)) continue;
      void api.learning.upsertMastery(toBackendMastery(m)).catch(() => {});
      syncedMastery.add(key);
    }
  },

  /** Hydrate the local cache from the authoritative backend (called on login/refresh). */
  async hydrate(_studentId: string): Promise<void> {
    if (!this.isBackend()) return;
    try {
      const [evRes, masRes] = await Promise.all([api.learning.getEvents(), api.learning.getMastery()]);
      for (const be of (evRes?.events ?? []) as any[]) {
        const e = fromBackendEvent(be) as unknown as { id: string; studentId: string; clientKey?: string };
        store.events.append(e as any);
        if (e.clientKey) syncedEvents.add(e.clientKey);
      }
      for (const bm of (masRes?.mastery ?? []) as any[]) {
        store.mastery.save(fromBackendMastery(bm));
        syncedMastery.add(`${bm.studentId}:${bm.nodeId}`);
      }
    } catch {
      /* network/auth failure: keep whatever is in the local cache */
    }
  },

  /** Authoritative progress (mastery rollup + recent events) — UI source of truth. */
  getProgress(): Promise<unknown> {
    return api.learning.getProgress();
  },
};
