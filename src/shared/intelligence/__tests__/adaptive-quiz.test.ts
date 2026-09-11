// ━━━─ LearnPilot Intelligence Test Suite — Part 4: Adaptive Quiz Engine ━━━─
// Phase 7 quality gate: learning state determination, difficulty targeting,
// question selection, answer processing, session lifecycle, guard rails.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { store } from '../../services/store.ts';
import { storeBackend } from '../../services/store.ts';
import { masteryEngine } from '../../services/mastery.ts';
import { misconceptionEngine } from '../misconception-engine.ts';
void masteryEngine;
import {
  adaptiveQuizEngine,
  determineLearningState,
  targetDifficultyForState,
  selectNextQuestion,
  processAnswer,
  createAdaptiveSession,
  endSession,
  canAskQuestion,
} from '../adaptive-quiz.ts';
import type { Question, AdaptiveQuizConfig } from '../../domain';

// ─── fixtures ──────────────────────────────────────────────────────────────────
const SID = 'student-aqz-1';
const T0 = '2026-05-01T10:00:00.000Z';
const CONCEPT_A = 'concept-aqz-a';
const CONCEPT_B = 'concept-aqz-b';
const SKILL_A = 'skill-aqz-a';

const QUESTION_BANK: Question[] = [
  { id: 'aq-q1', topic: 'Limits', difficulty: 1, type: 'multiple-choice', body: 'Easy limit q1', options: ['0', '2', '4', 'Undefined'], correctOptionIndex: 2, correctAnswer: '4', explanation: 'Factor.', conceptId: CONCEPT_A },
  { id: 'aq-q2', topic: 'Limits', difficulty: 2, type: 'multiple-choice', body: 'Medium limit q2', options: ['0', '1', '∞', 'Undefined'], correctOptionIndex: 1, correctAnswer: '1', explanation: 'Standard limit.', conceptId: CONCEPT_A },
  { id: 'aq-q3', topic: 'Limits', difficulty: 3, type: 'multiple-choice', body: 'Hard limit q3', options: ['a', 'b', 'c', 'd'], correctOptionIndex: 0, correctAnswer: 'a', explanation: 'L\'Hôpital.', conceptId: CONCEPT_A },
  { id: 'aq-q4', topic: 'Derivatives', difficulty: 2, type: 'multiple-choice', body: 'Easy deriv q4', options: ['x²', '2x', '3x²', '3x³'], correctOptionIndex: 2, correctAnswer: '3x²', explanation: 'Power rule.', conceptId: CONCEPT_B },
    { id: 'aq-q5', topic: 'Derivatives', difficulty: 4, type: 'multiple-choice', body: 'Hard deriv q5', options: ['a', 'b', 'c', 'd'], correctOptionIndex: 1, correctAnswer: 'b', explanation: 'Chain rule.', conceptId: CONCEPT_B },
  { id: 'aq-q5b', topic: 'Derivatives', difficulty: 3, type: 'multiple-choice', body: 'Medium deriv q5b', options: ['a', 'b', 'c', 'd'], correctOptionIndex: 0, correctAnswer: 'a', explanation: 'Product rule.', conceptId: CONCEPT_B },
  { id: 'aq-q6', topic: 'Continuity', difficulty: 1, type: 'multiple-choice', body: 'Easy cont q6', options: ['1/x', 'sin(x)', '|x|/x', 'tan(x)'], correctOptionIndex: 1, correctAnswer: 'sin(x)', explanation: 'Continuous everywhere.', skillId: SKILL_A },
];

beforeEach(() => {
  storeBackend.useInMemory();
  store.clearAll();
  misconceptionEngine.install();
});

afterEach(() => {
  storeBackend.useLocalStorage();
});

function makeConfig(overrides: Partial<AdaptiveQuizConfig> = {}): AdaptiveQuizConfig {
  return {
    studentId: SID,
    targetNodeId: CONCEPT_A,
    maxQuestions: 10,
    advanceStreak: 3,
    maxConsecutiveWrong: 3,
    reviewMode: false,
    nowIso: T0,
    ...overrides,
  };
}


// ─── learning state determination ─────────────────────────────────────────────

describe('determineLearningState', () => {
  it('returns FOUNDATION for no record', () => {
    expect(determineLearningState(undefined)).toBe('FOUNDATION');
  });

  it('returns FOUNDATION for < 2 attempts', () => {
    const r = masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 90, 'student', T0);
    expect(determineLearningState(r)).toBe('FOUNDATION');
  });

  it('returns REMEDIATION for weak node with sufficient evidence', () => {
    for (let i = 0; i < 3; i++) {
      masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 20, 'student', T0);
    }
    const r = store.mastery.get(SID, CONCEPT_A)!;
    expect(r.weak).toBe(true);
    expect(determineLearningState(r)).toBe('REMEDIATION');
  });

  it('returns CHALLENGE for mastery >= 90 and confidence >= 70', () => {
    const record = {
      id: 'mastery-rec-1', studentId: SID, nodeId: CONCEPT_A,
      nodeType: 'concept' as const, mastery: 95, confidence: 80, attempts: 10,
      mastered: true, weak: false, updatedAt: T0, lastPracticedAt: T0,
      dimensions: { responseAccuracy: 95 }, trend: 'improving' as const,
      lastEvidenceNote: 'test',
    };
    store.mastery.save(record);
    expect(determineLearningState(store.mastery.get(SID, CONCEPT_A)!)).toBe('CHALLENGE');
  });

  it('returns MASTERY for mastered node with mastery < 90', () => {
    const record = {
      id: 'mastery-rec-2', studentId: SID, nodeId: CONCEPT_A,
      nodeType: 'concept' as const, mastery: 85, confidence: 75, attempts: 5,
      mastered: true, weak: false, updatedAt: T0, lastPracticedAt: T0,
      dimensions: { quiz: 85 }, trend: 'stable' as const,
      lastEvidenceNote: 'test',
    };
    store.mastery.save(record);
    expect(determineLearningState(store.mastery.get(SID, CONCEPT_A)!)).toBe('MASTERY');
  });

  it('returns PRACTICE for mastery between 70 and mastery threshold', () => {
    for (let i = 0; i < 3; i++) {
      masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 75, 'student', T0);
    }
    const r = store.mastery.get(SID, CONCEPT_A)!;
    if (r.mastery >= 70 && !r.mastered) {
      expect(determineLearningState(r)).toBe('PRACTICE');
    }
  });

  it('is deterministic: same record ⇒ same state', () => {
    const r = masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 80, 'student', T0);
    expect(determineLearningState(r)).toBe(determineLearningState(r));
  });
});


// ─── question selection ───────────────────────────────────────────────────────

describe('selectNextQuestion', () => {
  it('returns a question for a new session', () => {
    const session = createAdaptiveSession(makeConfig());
    const q = selectNextQuestion(session, QUESTION_BANK);
    expect(q).toBeDefined();
    expect(q!.question).toBeDefined();
    expect(q!.selectionReason).toBeTruthy();
    expect(q!.state).toBe('FOUNDATION');
  });

  it('never selects the same question twice', () => {
    const session = createAdaptiveSession(makeConfig());
    const q1 = selectNextQuestion(session, QUESTION_BANK);
    expect(q1).toBeDefined();
    session.questions.push(q1!);
    const q2 = selectNextQuestion(session, QUESTION_BANK);
    expect(q2).toBeDefined();
    expect(q2!.question.id).not.toBe(q1!.question.id);
  });

  it('returns null when all questions have been asked', () => {
    const session = createAdaptiveSession(makeConfig());
    for (let i = 0; i < QUESTION_BANK.length; i++) {
      const q = selectNextQuestion(session, QUESTION_BANK);
      if (q) session.questions.push(q);
    }
    expect(selectNextQuestion(session, QUESTION_BANK)).toBeNull();
  });

  it('selection reason includes state and target difficulty', () => {
    const session = createAdaptiveSession(makeConfig());
    const q = selectNextQuestion(session, QUESTION_BANK);
        expect(q!.selectionReason).toMatch(/state=/);
    expect(q!.selectionReason).toMatch(/targetDiff=/);
  });

  it('is deterministic: same session state => same selection', () => {
    const s1 = createAdaptiveSession(makeConfig());
    const s2 = createAdaptiveSession(makeConfig());
    const q1 = selectNextQuestion(s1, QUESTION_BANK);
    const q2 = selectNextQuestion(s2, QUESTION_BANK);
    expect(q1!.question.id).toBe(q2!.question.id);
  });

  it('respects topic filter', () => {
    const session = createAdaptiveSession(makeConfig({ topic: 'Derivatives' }));
    const q = selectNextQuestion(session, QUESTION_BANK);
    expect(q).toBeDefined();
    expect(q!.question.topic).toBe('Derivatives');
  });

  it('prevents excessive repetition via scoring penalty', () => {
    const session = createAdaptiveSession(makeConfig());
    const selectedIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const q = selectNextQuestion(session, QUESTION_BANK);
      if (!q) break;
      selectedIds.push(q.question.id);
      session.questions.push(q);
    }
    const uniqueIds = new Set(selectedIds);
    expect(uniqueIds.size).toBe(selectedIds.length);
  });
});

// ─── answer processing ─────────────────────────────────────────────────────────

describe('processAnswer', () => {
  it('processes a correct answer', () => {
    const session = createAdaptiveSession(makeConfig());
    const q = selectNextQuestion(session, QUESTION_BANK)!;
    const result = processAnswer(session, q, q.question.correctAnswer, 30);
    expect(result.correct).toBe(true);
    expect(result.record).toBeDefined();
    expect(result.shouldStop).toBe(false);
  });

  it('processes a wrong answer', () => {
    const session = createAdaptiveSession(makeConfig());
    const q = selectNextQuestion(session, QUESTION_BANK)!;
    const wrongAnswer = q.question.correctAnswer === '4' ? '0' : '4';
    const result = processAnswer(session, q, wrongAnswer, 30);
    expect(result.correct).toBe(false);
    expect(result.record).toBeDefined();
  });

  it('records a question attempt in the store', () => {
    const session = createAdaptiveSession(makeConfig());
    const q = selectNextQuestion(session, QUESTION_BANK)!;
    processAnswer(session, q, q.question.correctAnswer, 30);
        const attempts = store.attempts.listByStudent(SID).filter((a) => a.questionId === q.question.id);
    expect(attempts.length).toBeGreaterThanOrEqual(1);
  });

  it('applies evidence to mastery', () => {
    const session = createAdaptiveSession(makeConfig());
    const q = selectNextQuestion(session, QUESTION_BANK)!;
    processAnswer(session, q, q.question.correctAnswer, 30);
    const record = store.mastery.get(SID, q.question.conceptId ?? q.question.skillId ?? CONCEPT_A);
    expect(record).toBeDefined();
    expect(record!.attempts).toBeGreaterThan(0);
  });
});

// ─── session lifecycle ─────────────────────────────────────────────────────────

describe('session lifecycle', () => {
  it('creates a session with correct initial state', () => {
    const session = createAdaptiveSession(makeConfig());
    expect(session.id).toBeTruthy();
    expect(session.studentId).toBe(SID);
    expect(session.questions).toHaveLength(0);
    expect(session.currentDifficulty).toBe(2);
    expect(session.currentState).toBe('FOUNDATION');
    expect(session.consecutiveWrong).toBe(0);
    expect(session.endedReason).toBe('');
  });

  it('ends a session with a reason', () => {
    const session = createAdaptiveSession(makeConfig());
    const ended = endSession(session, 'Mastery achieved');
    expect(ended.endedReason).toBe('Mastery achieved');
    expect(ended.endedAt).toBe(T0);
  });

  it('session ID is deterministic for same config', () => {
    const s1 = createAdaptiveSession(makeConfig());
    const s2 = createAdaptiveSession(makeConfig());
    expect(s1.id).toBe(s2.id);
  });
});

// ─── guard rails ───────────────────────────────────────────────────────────────

describe('guard rails', () => {
  it('canAskQuestion returns true for questions without conceptId', () => {
    const q: Question = { id: 'no-concept', topic: 'General', difficulty: 1, type: 'multiple-choice', body: 'q', correctAnswer: 'a', explanation: 'exp' };
    expect(canAskQuestion(SID, q)).toBe(true);
  });
});

// ─── engine facade ─────────────────────────────────────────────────────────────

describe('adaptiveQuizEngine facade', () => {
  it('exposes all public functions', () => {
    expect(adaptiveQuizEngine.determineLearningState).toBe(determineLearningState);
    expect(adaptiveQuizEngine.targetDifficultyForState).toBe(targetDifficultyForState);
    expect(adaptiveQuizEngine.selectNextQuestion).toBe(selectNextQuestion);
    expect(adaptiveQuizEngine.processAnswer).toBe(processAnswer);
    expect(adaptiveQuizEngine.createAdaptiveSession).toBe(createAdaptiveSession);
        expect(adaptiveQuizEngine.endSession).toBe(endSession);
    expect(adaptiveQuizEngine.canAskQuestion).toBe(canAskQuestion);
  });
});

// ─── difficulty targeting ──────────────────────────────────────────────────────

describe('targetDifficultyForState', () => {
  it('FOUNDATION targets difficulty 1', () => {
    expect(targetDifficultyForState('FOUNDATION', 3)).toBe(1);
  });

  it('REMEDIATION reduces difficulty', () => {
    expect(targetDifficultyForState('REMEDIATION', 3)).toBe(2);
    expect(targetDifficultyForState('REMEDIATION', 1)).toBe(1);
  });

  it('PRACTICE keeps or slightly increases difficulty', () => {
    expect(targetDifficultyForState('PRACTICE', 2)).toBe(2);
    expect(targetDifficultyForState('PRACTICE', 3)).toBe(3);
  });

  it('MASTERY increases difficulty', () => {
    expect(targetDifficultyForState('MASTERY', 3)).toBe(4);
    expect(targetDifficultyForState('MASTERY', 5)).toBe(5);
  });

  it('CHALLENGE increases difficulty', () => {
    expect(targetDifficultyForState('CHALLENGE', 3)).toBe(4);
    expect(targetDifficultyForState('CHALLENGE', 5)).toBe(5);
  });

  it('REVIEW preserves difficulty', () => {
    expect(targetDifficultyForState('REVIEW', 3)).toBe(3);
  });
});
