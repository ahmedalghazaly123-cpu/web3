// ━━━─ Mastery Engine Service ━━━─
// Tracks mastery per subject, course, module, lesson, topic, skill, prerequisite.
// Mastery is NOT a simple percentage — it aggregates multiple dimensions:
// quiz results, exam results, response accuracy, response time,
// repeated mistakes, revision frequency, completion, learning consistency,
// and difficulty adjustment. Produces trend signals, weak flags, and mastered flags.

import type {
  EntityId,
  MasteryRecord,
  MasteryEvidence,
  MasteryDimension,
  GraphNodeType,
} from '../domain';
import { store } from './store.ts';

// ─── mastery thresholds (single source of truth) ─────────────────────────────
// Deterministic, explainable thresholds. Not ML — see ingestEvidence notes.
const MASTERY_AT = 80; // mastery flag when ≥ this
const WEAK_BELOW = 50; // weak flag when < this
const MIN_ATTEMPTS_FOR_CONFIDENCE = 3; // flags require at least this much evidence
const REVIEW_PRIORITY_BELOW = 60; // review priority in the planner

// ─── helpers ─────────────────────────────────────────────────────────────────

function nowIso(): string {
  return new Date().toISOString();
}

function ensureRecord(
  studentId: EntityId,
  nodeId: EntityId,
  nodeType: GraphNodeType
): MasteryRecord {
  const existing = store.mastery.get(studentId, nodeId);
  if (existing) return existing;
  const record: MasteryRecord = {
    id: `mastery-${studentId}-${nodeId}`,
    studentId,
    nodeId,
    nodeType,
    mastery: 0,
    attempts: 0,
    lastPracticedAt: new Date(0).toISOString(),
    confidence: 0,
    updatedAt: nowIso(),
  };
  store.mastery.save(record);
  return record;
}

// ─── evidence ingestion ──────────────────────────────────────────────────────

function addEvidence(
  studentId: EntityId,
  nodeId: EntityId,
  nodeType: GraphNodeType,
  dimension: MasteryDimension,
  value: number,
  source: MasteryEvidence['source'],
  metadata?: Record<string, unknown>
): void {
  // Evidence is stored for auditing/analytics; mastery records are derived.
  // In a full system we would persist evidence separately; here we update
  // the mastery record directly for the demo.
  updateMasteryFromEvidence(studentId, nodeId, nodeType, dimension, value, source, metadata);
}

// ─── mastery update logic ────────────────────────────────────────────────────

/**
 * Update mastery based on new evidence.
 *
 * Core idea:
 * - Each dimension contributes to an overall mastery score.
 * - Recent evidence weighs more than old evidence (decay).
 * - Correct + fast performance increases mastery more.
 * - Repeated mistakes decrease mastery and raise flags.
 * - High-difficulty success is weighted more.
 * - Consistency (learning consistency dimension) supports confidence.
 */
function updateMasteryFromEvidence(
  studentId: EntityId,
  nodeId: EntityId,
  nodeType: GraphNodeType,
  dimension: MasteryDimension,
  value: number, // normalized 0-100 (or 1-5 for difficulty, etc.)
  _source: MasteryEvidence['source'],
  _metadata?: Record<string, unknown>
): MasteryRecord {
  let record = ensureRecord(studentId, nodeId, nodeType);

  const now = new Date();
  const last = new Date(record.lastPracticedAt);
  const daysSinceLast = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
  const decay = Math.min(1, Math.max(0.5, 1 - daysSinceLast * 0.05)); // gentle decay

  // Start from existing mastery, decayed
  let mastery = record.mastery * decay;

  // Dimension contributions
  const dims = { ...record.dimensions };

  switch (dimension) {
    case 'quiz':
    case 'exam': {
      // value is 0-100 (score)
      const weight = dimension === 'exam' ? 1.2 : 1;
      mastery += (value - record.mastery) * 0.3 * weight;
      dims.quiz = dims.quiz ?? value;
      dims.exam = dims.exam ?? value;
      break;
    }
    case 'responseAccuracy': {
      // value 0-100
      mastery += (value - 50) * 0.15;
      dims.responseAccuracy = value;
      break;
    }
    case 'responseTime': {
      // value 0-100 where higher = faster/better
      mastery += (value - 50) * 0.05;
      dims.responseTime = value;
      break;
    }
    case 'repeatedMistakes': {
      // value is count; more mistakes = lower mastery
      const penalty = Math.min(1, value / 5) * 0.1;
      mastery -= penalty * 10;
      dims.repeatedMistakes = value;
      break;
    }
    case 'revisionFrequency': {
      // value = times reviewed recently
      const boost = Math.min(1, value / 3) * 0.05;
      mastery += boost * 10;
      dims.revisionFrequency = value;
      break;
    }
    case 'completion': {
      // value 0-100
      mastery += (value - (record.dimensions?.completion ?? 0)) * 0.1;
      dims.completion = value;
      break;
    }
    case 'learningConsistency': {
      // value 0-100
      mastery += (value - 50) * 0.02;
      dims.learningConsistency = value;
      break;
    }
    case 'difficultyAdjusted': {
      // value 0-100, adjusted for difficulty
      mastery += (value - record.mastery) * 0.2;
      dims.difficultyAdjusted = value;
      break;
    }
  }

  // Clamp
  mastery = Math.max(0, Math.min(100, mastery));

  // Update attempts
  record.attempts += 1;
  record.lastPracticedAt = nowIso();

  // Confidence: how stable is this mastery estimate?
  const dimCount = Object.keys(dims).length;
  record.confidence = Math.min(
    100,
    (record.confidence ?? 0) * 0.9 + (dimCount * 5 + record.attempts) * 0.5
  );

  // Trend detection (simple: compare to previous mastery)
  const prevMastery = record.mastery;
  if (mastery > prevMastery + 5) record.trend = 'improving';
  else if (mastery < prevMastery - 5) record.trend = 'declining';
  else record.trend = 'stable';

  // Weak flag
  record.weak = mastery < 50;

  // Save and return the updated record
  store.mastery.save(record);
  return record;
}

// ─── public API ───────────────────────────────────────────────────────────────

export const masteryEngine = {
  /** Record a quiz result for a node (concept/lesson/topic/skill). */
  recordQuizResult: (
    studentId: EntityId,
    nodeId: EntityId,
    nodeType: GraphNodeType,
    score: number, // 0-100
    timeSpentSeconds: number,
    difficulty: number // 1-5
  ): MasteryRecord => {
    const record = ensureRecord(studentId, nodeId, nodeType);

    addEvidence(studentId, nodeId, nodeType, 'responseAccuracy', Math.min(100, score), 'quiz');

    const expectedSeconds = difficulty * 60;
    const timeRatio = Math.min(1, expectedSeconds / Math.max(1, timeSpentSeconds));
    const timeScore = Math.round(timeRatio * 100);
    addEvidence(studentId, nodeId, nodeType, 'responseTime', timeScore, 'quiz');

    const diffMultiplier = 1 + (difficulty - 3) * 0.1;
    const adjustedScore = Math.round(Math.min(100, Math.max(0, score * diffMultiplier)));
    addEvidence(studentId, nodeId, nodeType, 'difficultyAdjusted', adjustedScore, 'quiz');

    addEvidence(studentId, nodeId, nodeType, 'quiz', score, 'quiz');
    addEvidence(studentId, nodeId, nodeType, 'completion', 100, 'quiz');

    const consistency = (record.dimensions?.learningConsistency ?? 50) + 2;
    addEvidence(studentId, nodeId, nodeType, 'learningConsistency', Math.min(100, consistency), 'quiz');

    return store.mastery.get(studentId, nodeId)!;
  },

  /** Record a repeated mistake. */
  recordMistake: (
    studentId: EntityId,
    nodeId: EntityId,
    nodeType: GraphNodeType,
    repetitionCount: number
  ): MasteryRecord => {
    addEvidence(studentId, nodeId, nodeType, 'repeatedMistakes', repetitionCount, 'practice');

    const rec = store.mastery.get(studentId, nodeId);
    if (rec) {
      const penalty = Math.min(10, repetitionCount * 2);
      const newMastery = Math.max(0, rec.mastery - penalty);
      const updated: MasteryRecord = {
        ...rec,
        mastery: newMastery,
        updatedAt: nowIso(),
        weak: newMastery < 50,
      };
      store.mastery.save(updated);
      return updated;
    }

    return ensureRecord(studentId, nodeId, nodeType);
  },

  /** Record a revision session. */
  recordRevision: (
    studentId: EntityId,
    nodeId: EntityId,
    nodeType: GraphNodeType
  ): MasteryRecord => {
    const rec = store.mastery.get(studentId, nodeId) ?? ensureRecord(studentId, nodeId, nodeType);
    const revCount = (rec.dimensions?.revisionFrequency ?? 0) + 1;
    addEvidence(studentId, nodeId, nodeType, 'revisionFrequency', revCount, 'revision');

    const newMastery = Math.min(100, rec.mastery + 1);
    const updated: MasteryRecord = { ...rec, mastery: newMastery, updatedAt: nowIso() };
    store.mastery.save(updated);
    return updated;
  },

  /** Get mastery record for a node. */
  getMastery: (studentId: EntityId, nodeId: EntityId): MasteryRecord | undefined =>
    store.mastery.get(studentId, nodeId),

  /** Get all mastery records for a student. */
  listByStudent: (studentId: EntityId): MasteryRecord[] =>
    store.mastery.listByStudent(studentId),

  /** Get mastery level as a simple number (for display). */
  getMasteryLevel: (studentId: EntityId, nodeId: EntityId): number =>
    store.mastery.get(studentId, nodeId)?.mastery ?? 0,

  /** Reset all mastery for a student (development only). */
  resetForStudent: (studentId: EntityId): void => {
    store.mastery.listByStudent(studentId).forEach((r) => store.mastery.remove(r.id));
  },

  /** Initialize demo mastery data for a student across a set of nodes. */
  seedDemoData: (
    studentId: EntityId,
    nodes: Array<{ id: EntityId; type: GraphNodeType; mastery?: number }>
  ): MasteryRecord[] => {
    const records: MasteryRecord[] = [];
    for (const n of nodes) {
      const record: MasteryRecord = {
        id: `mastery-${studentId}-${n.id}`,
        studentId,
        nodeId: n.id,
        nodeType: n.type,
        mastery: n.mastery ?? 50,
        attempts: Math.floor(Math.random() * 10) + 1,
        lastPracticedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        confidence: 30 + Math.floor(Math.random() * 40),
        weak: (n.mastery ?? 50) < 50,
        mastered: (n.mastery ?? 50) >= 80,
        updatedAt: nowIso(),
      };
      store.mastery.save(record);
      records.push(record);
    }
    return records;
  },

  /** Record an exam result. */
  recordExamResult: (
    studentId: EntityId,
    nodeId: EntityId,
    nodeType: GraphNodeType,
    score: number,
    totalQuestions: number,
    correctCount: number,
    _timeSpentSeconds: number
  ): MasteryRecord => {
    addEvidence(studentId, nodeId, nodeType, 'exam', score, 'exam');
    addEvidence(studentId, nodeId, nodeType, 'responseAccuracy', score, 'exam');
    addEvidence(studentId, nodeId, nodeType, 'completion', 100, 'exam');

    const perQuestionAccuracy = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
    addEvidence(studentId, nodeId, nodeType, 'responseAccuracy', perQuestionAccuracy, 'exam');

    return store.mastery.get(studentId, nodeId)!;
  },

  /** Record a practice response (AI Tutor / practice). */
  recordPracticeResponse: (
    studentId: EntityId,
    nodeId: EntityId,
    nodeType: GraphNodeType,
    correct: boolean,
    timeSpentSeconds: number,
    difficulty: number
  ): MasteryRecord => {
    const accuracy = correct ? 100 : 0;
    addEvidence(studentId, nodeId, nodeType, 'responseAccuracy', accuracy, 'practice');

    const expectedSeconds = difficulty * 30;
    const timeRatio = Math.min(1, expectedSeconds / Math.max(1, timeSpentSeconds));
    addEvidence(studentId, nodeId, nodeType, 'responseTime', Math.round(timeRatio * 100), 'practice');

    const rec = store.mastery.get(studentId, nodeId);
    if (rec) {
      const boost = correct ? 2 : -1;
      const newMastery = Math.max(0, Math.min(100, rec.mastery + boost));
      const updated: MasteryRecord = { ...rec, mastery: newMastery, updatedAt: nowIso() };
      store.mastery.save(updated);
      return updated;
    }

    return ensureRecord(studentId, nodeId, nodeType);
  },

  // ─── Phase 2: deterministic, explainable evidence ingestion ──────────────────
  //
  // ingestEvidence is the sanctioned single entry point used by the learning
  // events pipeline (@shared/intelligence/learning-events). It improves on the
  // legacy addEvidence heuristics with:
  //  - per-dimension evidence weights (accuracy > difficulty-adjusted > time)
  //  - recency weighting computed from the event's happenedAt (NOT the wall clock)
  //  - forgetting decay between practices (gentle, clamped, explainable)
  //  - uncertainty tracking via evidence count → confidence
  //  - minimum evidence requirement before weak/mastered flags are set
  //  - mastery thresholds (MASTERY_AT / WEAK_BELOW)
  //  - an explainability trail (what moved mastery and why)
  //
  // This is intentionally NOT machine learning — it is a deterministic,
  // explainable estimator that is ML-ready (Phase 38 will train on the same
  // evidence stream once longitudinal backend data exists).

  ingestEvidence: (
    studentId: EntityId,
    nodeId: EntityId,
    nodeType: GraphNodeType,
    dimension: MasteryDimension,
    value: number,
    source: MasteryEvidence['source'],
    happenedAt: string
  ): MasteryRecord => {
    const record = ensureRecord(studentId, nodeId, nodeType);

    // normalize incoming value
    const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

    // recency: days between this evidence and the previous practice
    const last = new Date(record.lastPracticedAt);
    const now = new Date(happenedAt);
    const daysSince = Math.max(0, (now.getTime() - last.getTime()) / 86_400_000);
    // forgetting decay: mastery fades up to 25% after ~14 idle days, then holds
    const decay = daysSince === 0 ? 1 : Math.max(0.75, 1 - daysSince * 0.018);
    const decayed = record.mastery * decay;

    // per-dimension contribution toward mastery (evidence-weighted)
    // weight × (signal − current) nudges mastery toward the signal.
    const DIMENSION_WEIGHT: Record<MasteryDimension, number> = {
      quiz: 0.30,
      exam: 0.34,
      responseAccuracy: 0.18,
      responseTime: 0.05,
      repeatedMistakes: 0.12,
      revisionFrequency: 0.06,
      completion: 0.10,
      learningConsistency: 0.04,
      difficultyAdjusted: 0.15,
    };
    // target mastery value implied by this evidence
    const signalTarget: Record<MasteryDimension, number> = {
      quiz: v,
      exam: v,
      responseAccuracy: v,
      responseTime: v,
      repeatedMistakes: Math.max(0, 100 - Math.min(50, v * 10)), // more repeats → lower target
      revisionFrequency: Math.min(100, 40 + v * 12), // regular revision supports mastery
      completion: v,
      learningConsistency: v,
      difficultyAdjusted: v,
    };

    const weight = DIMENSION_WEIGHT[dimension];
    const target = signalTarget[dimension];
    let mastery = decayed + (target - decayed) * weight;

    // attempts & practice recency
    record.attempts += 1;
    record.lastPracticedAt = happenedAt;

    // per-dimension breakdown keeps the latest observed value per dimension
    const dims = { ...(record.dimensions ?? {}) };
    dims[dimension] = v;
    record.dimensions = dims;

    // uncertainty / confidence:
    //  - grows with distinct dimensions observed and total attempts
    //  - capped at 95 (absolute certainty is never claimed)
    const distinctDims = Object.keys(dims).length;
    const evidenceScore = Math.min(1, record.attempts / MIN_ATTEMPTS_FOR_CONFIDENCE);
    const coverageScore = Math.min(1, distinctDims / 4);
    record.confidence = Math.round(Math.min(95, 100 * (0.6 * evidenceScore + 0.4 * coverageScore)));

    // clamp & flags — flags require minimum evidence to avoid premature labels
    mastery = Math.max(0, Math.min(100, Number.isFinite(mastery) ? mastery : 0));
    const prevMastery = Number.isFinite(record.mastery) ? record.mastery : 0;
    record.mastery = mastery;
    record.updatedAt = happenedAt;

    const enoughEvidence = record.attempts >= MIN_ATTEMPTS_FOR_CONFIDENCE;
    record.weak = enoughEvidence && mastery < WEAK_BELOW;
    record.mastered = enoughEvidence && mastery >= MASTERY_AT;

    // trend: compare against the pre-evidence mastery
    if (mastery > prevMastery + 2) record.trend = 'improving';
    else if (mastery < prevMastery - 2) record.trend = 'declining';
    else record.trend = 'stable';

    // explainability trail (kept small: last contribution only)
    record.lastEvidenceNote =
      `${dimension}=${v} (${source}) → weight ${weight}, decay ${decay.toFixed(2)}, ` +
      `mastery ${prevMastery.toFixed(1)}→${mastery.toFixed(1)}`;

    store.mastery.save(record);
    return record;
  },

  /** Thresholds + constants used by ingestEvidence (single source of truth). */
  thresholds: {
    MASTERY_AT: MASTERY_AT,
    WEAK_BELOW: WEAK_BELOW,
    MIN_ATTEMPTS_FOR_CONFIDENCE: MIN_ATTEMPTS_FOR_CONFIDENCE,
    /** Review hint: below this mastery, review is prioritized by the planner. */
    REVIEW_PRIORITY_BELOW: REVIEW_PRIORITY_BELOW,
  },
};
