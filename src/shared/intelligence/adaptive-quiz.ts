// ━━━─ LearnPilot Learning Intelligence — Phase 7: Adaptive Quiz Engine ━━━─
// Selects questions based on mastery, confidence, recent performance, mistake
// patterns, prerequisite state, question difficulty, exposure, and review need.
//
// Design rules:
// - Deterministic given identical inputs (ISO timestamps are inputs, not clocks).
// - Consumes existing learning intelligence (mastery, knowledge graph, student state).
// - Explainable: every selection has a reason.
// - Guard rails: no excessive repetition, no impossible difficulty jumps, no
//   testing concepts with clearly missing prerequisites, no endless easy questions.

import type {
  AdaptiveQuizConfig,
  AdaptiveQuizAnswerResult,
  AdaptiveQuizQuestion,
  AdaptiveQuizSession,
  EntityId,
  GraphNodeType,
  LearningState,
  MasteryRecord,
  Question,
} from '../domain';
import { store } from '../services/store.ts';
import { masteryEngine } from '../services/mastery.ts';
import { learningEvents, fnv1a } from './learning-events.ts';
import { misconceptionEngine } from './misconception-engine.ts';
import { graphIntelligence } from './graph-intelligence.ts';

// ─── learning state determination ─────────────────────────────────────────────

const THRESHOLDS = {
  MASTERY_AT: 80,
  WEAK_BELOW: 50,
  PRACTICE_BELOW: 70,
  MIN_ATTEMPTS_FOR_CONFIDENCE: 3,
  CHALLENGE_ABOVE: 90,
} as const;

/**
 * Pure rule: determine the learning state for a node given its mastery record.
 * No randomness, no clock reads — deterministic.
 */
export function determineLearningState(record: MasteryRecord | undefined): LearningState {
  if (!record || record.attempts < 2) return 'FOUNDATION';
  if (record.weak && record.attempts >= THRESHOLDS.MIN_ATTEMPTS_FOR_CONFIDENCE) return 'REMEDIATION';
  if (record.mastery >= THRESHOLDS.CHALLENGE_ABOVE && (record.confidence ?? 0) >= 70) return 'CHALLENGE';
  if (record.mastered) return 'MASTERY';
  if (record.mastery >= THRESHOLDS.PRACTICE_BELOW) return 'PRACTICE';
  return 'FOUNDATION';
}

// ─── difficulty targeting ──────────────────────────────────────────────────────

/**
 * Pure rule: given a learning state, what difficulty (1-5) should we target?
 */
export function targetDifficultyForState(state: LearningState, currentDifficulty: number): number {
  switch (state) {
    case 'FOUNDATION': return 1;
    case 'REMEDIATION': return Math.max(1, currentDifficulty - 1);
    case 'PRACTICE': return Math.min(5, Math.max(2, currentDifficulty));
    case 'MASTERY': return Math.min(5, currentDifficulty + 1);
    case 'CHALLENGE': return Math.min(5, currentDifficulty + 1);
    case 'REVIEW': return Math.max(1, currentDifficulty);
    default: return currentDifficulty;
  }
}


// ─── question selection ───────────────────────────────────────────────────────

/**
 * Pure rule: score a candidate question for how well it fits the current need.
 * Higher = better fit. Deterministic.
 */
function scoreQuestion(
  q: Question,
  state: LearningState,
  targetDiff: number,
  askedIds: Set<EntityId>,
  weakConcepts: EntityId[],
  reviewIds: EntityId[],
): number {
  let score = 0;

  // 1. Difficulty match (most important)
  const diffDelta = Math.abs(q.difficulty - targetDiff);
  score += (5 - diffDelta) * 10;

  // 2. Avoid repetition: heavily penalize already-asked questions
  if (askedIds.has(q.id)) score -= 1000;

  // 3. Prefer questions targeting weak concepts
  if (q.conceptId && weakConcepts.includes(q.conceptId)) score += 15;

  // 4. In review mode, prefer questions linked to due reviews
  if (reviewIds.includes(q.id)) score += 20;

  // 5. In REMEDIATION, prefer easier questions
  if (state === 'REMEDIATION' && q.difficulty <= 2) score += 8;

  // 6. In CHALLENGE, prefer harder questions
  if (state === 'CHALLENGE' && q.difficulty >= 4) score += 8;

  // 7. Slight preference for questions with skill/concept linkage (more evidence value)
  if (q.skillId || q.conceptId) score += 3;

  return score;
}

/**
 * Select the next question for an adaptive quiz session.
 * Returns null if no suitable question exists.
 */
export function selectNextQuestion(
  session: AdaptiveQuizSession,
  questionBank: Question[],
): AdaptiveQuizQuestion | null {
  const { config } = session;
  const askedIds = new Set(session.questions.map((q) => q.question.id));

  // Determine target node
  const nodeId = config.targetNodeId ?? session.touchedNodes[0];
  if (!nodeId) return null;

  const record = store.mastery.get(config.studentId, nodeId);
  const state = determineLearningState(record);
  const targetDiff = targetDifficultyForState(state, session.currentDifficulty);

  // Gather weak concepts for prioritization
  const allMastery = store.mastery.listByStudent(config.studentId);
  const weakConcepts = allMastery.filter((r) => r.weak).map((r) => r.nodeId);

  // Gather due review question IDs
  const reviewIds = store.reviews
    .listByStudent(config.studentId)
    .filter((r) => r.nextReviewAt <= config.nowIso && r.questionId)
    .map((r) => r.questionId!);

  // Filter the question bank
  let pool = questionBank.filter((q) => {
    if (askedIds.has(q.id)) return false;
    if (config.topic && q.topic !== config.topic) return false;
    if (config.courseId && q.courseId && q.courseId !== config.courseId) return false;
    return true;
  });

  // Guard rail: if pool is too small, relax the topic constraint
  if (pool.length < 3 && config.topic) {
    pool = questionBank.filter((q) => !askedIds.has(q.id));
  }

  // Guard rail: if still empty, we've exhausted the bank
  if (pool.length === 0) return null;

  // Score and sort (deterministic: stable sort by score desc, then by id asc)
  const scored = pool
    .map((q) => ({
      q,
      score: scoreQuestion(q, state, targetDiff, askedIds, weakConcepts, reviewIds),
    }))
    .sort((a, b) => b.score - a.score || a.q.id.localeCompare(b.q.id));

  const chosen = scored[0];

  // Build selection reason
  const reasonParts: string[] = [
    `state=${state}`,
    `targetDiff=${targetDiff}`,
    `mastery=${record?.mastery ?? 'N/A'}`,
  ];
  if (chosen.q.conceptId && weakConcepts.includes(chosen.q.conceptId)) {
    reasonParts.push('targets-weak-concept');
  }
  if (reviewIds.includes(chosen.q.id)) {
    reasonParts.push('due-review');
  }

  return {
    question: chosen.q,
    selectionReason: reasonParts.join(', '),
    state,
    targetDifficulty: targetDiff,
    isReview: reviewIds.includes(chosen.q.id),
  };
}


export function processAnswer(
  session: AdaptiveQuizSession,
  question: AdaptiveQuizQuestion,
  selectedAnswer: string,
  timeSpentSeconds: number,
): AdaptiveQuizAnswerResult {
  const { config } = session;
  const q = question.question;
  const correct = selectedAnswer === q.correctAnswer;

  // Determine node for evidence projection
  const nodeId = q.conceptId ?? q.skillId ?? config.targetNodeId ?? 'unknown';
  const nodeType: GraphNodeType = q.conceptId ? 'concept' : q.skillId ? 'skill' : 'topic';

  // Project evidence through the mastery engine
  const record = masteryEngine.ingestEvidence(
    config.studentId,
    nodeId,
    nodeType,
    'responseAccuracy',
    correct ? 100 : 0,
    'assessment',
    config.nowIso,
  );

  // Also project difficulty-adjusted evidence
  masteryEngine.ingestEvidence(
    config.studentId,
    nodeId,
    nodeType,
    'difficultyAdjusted',
    Math.min(100, Math.max(0, (correct ? 100 : 0) * (1 + (q.difficulty - 3) * 0.1))),
    'assessment',
    config.nowIso,
  );

  // Record the question attempt through the full pipeline
  learningEvents.recordQuestionAttempt({
    studentId: config.studentId,
    question: q,
    nodeId,
    nodeType,
    correct,
    selectedAnswer,
    timeSpentSeconds,
    mode: 'adaptive',
    source: 'assessment',
    happenedAt: config.nowIso,
    clientKey: `adaptive-${session.id}-${q.id}`,
  });

  // Compute new state
  const newState = determineLearningState(record);
  let nextDifficulty = session.currentDifficulty;
  let shouldStop = false;
  let stopReason = '';
  const consecutiveWrong = correct ? 0 : session.consecutiveWrong + 1;

  if (correct) {
    const correctStreak = computeCorrectStreak(session);
    if (correctStreak >= config.advanceStreak) {
      nextDifficulty = Math.min(5, session.currentDifficulty + 1);
    }
  } else {
    nextDifficulty = Math.max(1, session.currentDifficulty - 1);
    if (consecutiveWrong >= config.maxConsecutiveWrong) {
      shouldStop = true;
      stopReason = `${consecutiveWrong} consecutive wrong answers — remediation recommended`;
    }
  }

  // Guard rail: mastery achieved with high confidence → can stop
  if (record && record.mastered && (record.confidence ?? 0) >= 80 && session.questions.length >= 5) {
    shouldStop = true;
    stopReason = 'Mastery achieved with high confidence';
  }

  const recoveredMistake = correct && misconceptionEngine.wasRecovered(config.studentId, q.id);

  return {
    correct,
    record,
    newState,
    nextDifficulty,
    shouldStop,
    stopReason,
    recoveredMistake,
  };
}

/** Count the trailing correct answers in a session. */
function computeCorrectStreak(session: AdaptiveQuizSession): number {
  let streak = 0;
  for (let i = session.questions.length - 1; i >= 0; i--) {
    if (session.correctIndices.includes(i)) streak++;
    else break;
  }
  return streak;
}

// ─── session lifecycle ─────────────────────────────────────────────────────────

function deriveSessionId(config: AdaptiveQuizConfig): string {
  return `aqs-${config.studentId}-${fnv1a(`${config.targetNodeId ?? 'auto'}-${config.maxQuestions}-${config.nowIso}`)}`;
}

/** Create a new adaptive quiz session. */
export function createAdaptiveSession(config: AdaptiveQuizConfig): AdaptiveQuizSession {
  return {
    id: deriveSessionId(config),
    studentId: config.studentId,
    config,
    questions: [],
    correctIndices: [],
    currentDifficulty: 2,
    currentState: 'FOUNDATION',
    consecutiveWrong: 0,
    endedReason: '',
    touchedNodes: config.targetNodeId ? [config.targetNodeId] : [],
    startedAt: config.nowIso,
  };
}

/** End a session with a reason. */
export function endSession(session: AdaptiveQuizSession, reason: string): AdaptiveQuizSession {
  return {
    ...session,
    endedReason: reason,
    endedAt: session.config.nowIso,
  };
}

/** Guard rail: check if a question's prerequisites are satisfied. */
export function canAskQuestion(studentId: EntityId, q: Question): boolean {
  if (!q.conceptId) return true;
  return graphIntelligence.canLearn(studentId, q.conceptId);
}

// ━━━─ engine facade ─────────────────────────────────────────────────────────────

export const adaptiveQuizEngine = {
  determineLearningState,
  targetDifficultyForState,
  selectNextQuestion,
  processAnswer,
  createAdaptiveSession,
  endSession,
    canAskQuestion,
};
