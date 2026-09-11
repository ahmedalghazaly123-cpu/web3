// ━━━─ LearnPilot Learning Intelligence — Phase 1: Learning Events & Evidence ━━━─
// First-class event pipeline:
//   LearningAction → LearningEvent → EvidenceProcessor → Evidence → Student State
//
// Design rules:
// - Deterministic: same inputs → same outputs (ISO timestamps are inputs, not clocks).
// - Store-backed: persisted through @shared/services/store (swappable backend),
//   never through UI state or localStorage directly.
// - Backend-ready: shapes are flat JSON, ready for server persistence later.
// - Evidence processing is the ONLY sanctioned mutation path into mastery.

import type {
  EntityId,
  GraphNodeType,
  MasteryEvidence,
  MasteryDimension,
  Question,
  QuestionAttempt,
} from '../domain';
import { store, type StoredRawEvent } from '../services/store.ts';
import { masteryEngine } from '../services/mastery.ts';

// ─── learning event model ─────────────────────────────────────────────────────

export type LearningEventKind =
  | 'lesson-viewed'
  | 'lesson-completed'
  | 'question-answered'
  | 'quiz-submitted'
  | 'exam-submitted'
  | 'review-completed'
  | 'mistake-recorded'
  | 'concept-linked'
  | 'session-started'
  | 'session-ended'
  | 'goal-updated';

export type LearningEventSource =
  | 'student'
  | 'assessment'
  | 'ai-tutor'
  | 'planner'
  | 'spaced-repetition'
  | 'classroom'
  | 'system';

/** Idempotency key + de-dup: identical client keys must not produce duplicate evidence. */
export interface LearningEvent {
  id: EntityId;
  kind: LearningEventKind;
  studentId: EntityId;
  source: LearningEventSource;
  happenedAt: string; // ISO — supplied by caller for determinism; pipeline never reads the clock
  // target of the learning action
  nodeId?: EntityId;
  nodeType?: GraphNodeType;
  courseId?: EntityId;
  lessonId?: EntityId;
  questionId?: EntityId;
  sessionId?: EntityId;
  assessmentId?: EntityId;
  // payload for kind-specific data (question answer, duration, score…)
  payload?: Record<string, unknown>;
  clientKey?: string; // de-duplication key (client-generated, stable across retries)
  question?: Question;
  correct?: boolean;
  selectedAnswer?: string;
  timeSpentSeconds?: number;
  score?: number;
}

export type LearningEventInput = Omit<LearningEvent, 'id'>;

/**
 * Evidence derived from a learning event. Evidence is an immutable observation;
 * mastery records are projections. Metadata is for analytics/auditing.
 */
export type DerivedEvidence = MasteryEvidence & { derivedFromEventId: EntityId };

// ─── de-duplication ───────────────────────────────────────────────────────────

function eventKey(e: Pick<LearningEvent, 'kind' | 'studentId' | 'clientKey' | 'id'>): string {
  return e.clientKey ? `${e.kind}:${e.studentId}:${e.clientKey}` : `${e.id}:${e.studentId}`;
}


// ─── evidence derivation rules (deterministic) ────────────────────────────────

export interface EvidenceDerivationInput {
  event: LearningEvent;
  question?: Question;
  /** Answer the student gave (already graded when question absent). */
  correct?: boolean;
  timeSpentSeconds?: number;
  score?: number; // 0-100 for quiz/exam submissions
}

export interface DerivedObservation {
  dimension: MasteryDimension;
  value: number;
  source: MasteryEvidence['source'];
  metadata?: Record<string, unknown>;
}

/**
 * Pure rule: a learning event maps to 0..n evidence observations.
 * Exposed separately from ingestion so it is unit-testable without persistence.
 */
export function deriveEvidence(input: EvidenceDerivationInput): DerivedObservation[] {
  const { event, question, correct, timeSpentSeconds, score } = input;
  const out: DerivedObservation[] = [];

  const questionSource: MasteryEvidence['source'] =
    event.source === 'assessment' ? 'quiz' : event.source === 'ai-tutor' ? 'ai-tutor' : 'practice';

  switch (event.kind) {
    case 'question-answered': {
      if (!event.nodeId || correct === undefined) break;
      out.push({
        dimension: 'responseAccuracy',
        value: correct ? 100 : 0,
        source: questionSource,
        metadata: { questionId: event.questionId ?? question?.id, nodeType: event.nodeType },
      });
      if (question && timeSpentSeconds !== undefined) {
        const expectedSeconds = question.difficulty * 60;
        const timeRatio = Math.min(1, expectedSeconds / Math.max(1, timeSpentSeconds));
        out.push({
          dimension: 'responseTime',
          value: Math.round(timeRatio * 100),
          source: questionSource,
          metadata: { difficulty: question.difficulty, timeSpentSeconds },
        });
        out.push({
          dimension: 'difficultyAdjusted',
          value: Math.round(
            Math.min(100, Math.max(0, (correct ? 100 : 0) * (1 + (question.difficulty - 3) * 0.1)))
          ),
          source: questionSource,
          metadata: { difficulty: question.difficulty },
        });
      }
      break;
    }
    case 'quiz-submitted':
    case 'exam-submitted': {
      if (score === undefined) break;
      out.push({
        dimension: event.kind === 'exam-submitted' ? 'exam' : 'quiz',
        value: Math.max(0, Math.min(100, score)),
        source: 'quiz',
        metadata: { assessmentId: event.assessmentId },
      });
      out.push({
        dimension: 'completion',
        value: 100,
        source: 'quiz',
        metadata: { assessmentId: event.assessmentId },
      });
      break;
    }
    case 'lesson-completed': {
      if (!event.nodeId) break;
      out.push({ dimension: 'completion', value: 100, source: 'session', metadata: { lessonId: event.lessonId } });
      break;
    }
    case 'review-completed': {
      if (!event.nodeId) break;
      const quality = Number(event.payload?.['quality'] ?? 3);
      out.push({
        dimension: 'revisionFrequency',
        value: Math.max(0, Math.min(5, quality)),
        source: 'revision',
        metadata: { quality },
      });
      break;
    }
    case 'mistake-recorded': {
      if (!event.nodeId) break;
      const repetitionCount = Number(event.payload?.['repetitionCount'] ?? 1);
      out.push({
        dimension: 'repeatedMistakes',
        value: repetitionCount,
        source: 'practice',
        metadata: { repetitionCount },
      });
      break;
    }
    default:
      // session lifecycle / goal updates produce mastery-adjacent evidence later
      break;
  }
  return out;
}

// ─── deterministic ids ────────────────────────────────────────────────────────

/** FNV-1a (32-bit) — small, fast, deterministic; NOT cryptographic (no security use). */
export function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

function deriveEventId(e: Omit<LearningEvent, 'id'>): EntityId {
  // Deterministic id: stable across retries with the same clientKey (idempotency),
  // unique otherwise. No clock read → deterministic given identical inputs.
  const key =
    e.clientKey ??
    `${e.kind}-${e.nodeId ?? e.questionId ?? e.assessmentId ?? 'none'}-${e.happenedAt}`;
  return `ev-${e.studentId}-${e.kind}-${fnv1a(key)}`;
}


// ─── pipeline ─────────────────────────────────────────────────────────────────

export interface IngestResult {
  event: LearningEvent;
  duplicate: boolean;
  evidence: DerivedEvidence[];
  /** Mastery projections updated by this event (already persisted). */
  masteryTouched: EntityId[];
}

function toEvidence(event: LearningEvent, d: DerivedObservation): DerivedEvidence {
  return {
    id: `evd-${event.id}-${d.dimension}`,
    studentId: event.studentId,
    nodeId: event.nodeId ?? event.assessmentId ?? 'unknown',
    nodeType: event.nodeType ?? 'course',
    dimension: d.dimension,
    value: d.value,
    source: d.source,
    happenedAt: event.happenedAt,
    metadata: d.metadata,
    derivedFromEventId: event.id,
  };
}

/**
 * Ingest a learning event:
 * 1. de-duplicate (same student+kind+clientKey → return the original result, `duplicate: true`)
 * 2. derive evidence (pure rules)
 * 3. project evidence into mastery records (the ONLY mutation path)
 * 4. persist event + evidence for audit/analytics
 */
export const learningEvents = {
  ingest(raw: Omit<LearningEvent, 'id'>): IngestResult {
    const event: LearningEvent = { ...raw, id: deriveEventId(raw) };
    const dupKey = eventKey(event);

    // 1. de-duplication
    const prior = this.listByStudent(event.studentId).find((x) => eventKey(x) === dupKey);
    if (prior) return { event: prior, duplicate: true, evidence: [], masteryTouched: [] };

    // 2. derive evidence (pure) — support both payload form and convenience top-level fields
    const questionFromStore = event.questionId ? (store.questions.get(event.questionId) ?? undefined) : undefined;
    const question = (event.question as Question | undefined) ?? questionFromStore;
    const correct = (event.payload?.['correct'] as boolean | undefined) ?? (event.correct as boolean | undefined);
    const timeSpentSeconds = (event.payload?.['timeSpentSeconds'] as number | undefined) ?? (event.timeSpentSeconds as number | undefined);
    const score = (event.payload?.['score'] as number | undefined) ?? (event.score as number | undefined);
    const derived = deriveEvidence({
      event,
      question,
      correct,
      timeSpentSeconds,
      score,
    });

    // 3. project into mastery (only sanctioned mutation path)
    const masteryTouched: EntityId[] = [];
    const evidence: DerivedEvidence[] = [];
    for (const d of derived) {
      const ev = toEvidence(event, d);
      learningEvents.applyEvidence(ev);
      evidence.push(ev);
      masteryTouched.push(ev.nodeId);
    }

    // 4. persist event
    this.saveEvent(event);
    return { event, duplicate: false, evidence, masteryTouched: [...new Set(masteryTouched)] };
  },

  /** Convenience: record a graded question attempt as a full event pipeline run. */
  recordQuestionAttempt(input: {
    studentId: EntityId;
    question: Question;
    nodeId: EntityId;
    nodeType: GraphNodeType;
    correct: boolean;
    selectedAnswer: string;
    timeSpentSeconds: number;
    mode?: QuestionAttempt['mode'];
    source?: LearningEventSource;
    happenedAt: string;
    clientKey?: string;
  }): IngestResult {
    const r = this.ingest({
      kind: 'question-answered',
      studentId: input.studentId,
      source:
        input.source ??
        (input.mode === 'exam'
          ? 'assessment'
          : input.mode === 'ai-tutor'
            ? 'ai-tutor'
            : 'assessment'),
      happenedAt: input.happenedAt,
      nodeId: input.nodeId,
      nodeType: input.nodeType,
      questionId: input.question.id,
      question: input.question,
      correct: input.correct,
      selectedAnswer: input.selectedAnswer,
      timeSpentSeconds: input.timeSpentSeconds,
      payload: {
        correct: input.correct,
        selectedAnswer: input.selectedAnswer,
        timeSpentSeconds: input.timeSpentSeconds,
        mode: input.mode ?? 'adaptive',
      },
      clientKey: input.clientKey,
    });

    // Persist the attempt record (shared question-attempt history)
    store.attempts.save({
      id: `att-${r.event.id}`,
      studentId: input.studentId,
      questionId: input.question.id,
      selectedAnswer: input.selectedAnswer,
      correct: input.correct,
      timeSpentSeconds: input.timeSpentSeconds,
      answeredAt: input.happenedAt,
      mode: input.mode ?? 'adaptive',
    });

    // Mistake recording routes through the misconception engine (Phase 4) via a
    // registered observer — dependency inversion, no hard engine dependency here.
    if (!input.correct) {
      misconceptionObserverHook?.({
        studentId: input.studentId,
        question: input.question,
        nodeId: input.nodeId,
        nodeType: input.nodeType,
        timeSpentSeconds: input.timeSpentSeconds,
        selectedAnswer: input.selectedAnswer,
        happenedAt: input.happenedAt,
      });
    }
    return r;
  },

  /** Projects one evidence observation into mastery (delegates to mastery engine). */
  applyEvidence(evidence: DerivedEvidence): void {
    masteryEngine.ingestEvidence(
      evidence.studentId,
      evidence.nodeId,
      evidence.nodeType,
      evidence.dimension,
      evidence.value,
      evidence.source,
      evidence.happenedAt
    );
  },

  // persistence (store-backed; shapes stay flat JSON for the future backend).
  // The cast is safe: LearningEvent is a flat JSON shape; the structural index
  // signature lives on StoredRawEvent (interfaces are not index-assignable).
  listByStudent(studentId: EntityId): LearningEvent[] {
    return store.events.listByStudent(studentId) as unknown as LearningEvent[];
  },
  saveEvent(event: LearningEvent): void {
    store.events.append(event as unknown as StoredRawEvent);
  },
  clearEvents(studentId: EntityId): void {
    store.events.clearByStudent(studentId);
  },
};

// ─── misconception observer hook (dependency inversion) ───────────────────────
// Registered by @shared/intelligence/misconception-engine at module load so the
// event pipeline routes mistakes through the misconception engine without a
// direct import (events → misconception observer interface only).

export type MisconceptionObserver = (input: {
  studentId: EntityId;
  question: Question;
  nodeId: EntityId;
  nodeType: GraphNodeType;
  timeSpentSeconds: number;
  selectedAnswer: string;
  happenedAt: string;
}) => void;

let misconceptionObserverHook: MisconceptionObserver | null = null;

export function registerMisconceptionObserver(fn: MisconceptionObserver): void {
  misconceptionObserverHook = fn;
}
