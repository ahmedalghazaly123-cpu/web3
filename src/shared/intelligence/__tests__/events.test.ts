// ━━━─ LearnPilot Intelligence Test Suite — Part 1: Learning Events & Evidence ━━━─
// Phase 1 quality gate: deterministic evidence derivation, de-dup, ingestion.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { deriveEvidence } from '../learning-events.ts';
import type { EvidenceDerivationInput } from '../learning-events.ts';
import { store, storeBackend } from '../../services/store.ts';
import type { Question } from '../../domain';

// ─── fixtures ──────────────────────────────────────────────────────────────────
const SID = 'student-events-1';
const T0 = '2026-02-01T10:00:00.000Z';
const CONCEPT_ID = 'concept-events-1';
const LESSON_ID = 'lesson-events-1';
const QUESTION_ID = 'question-events-1';

const QUESTION: Question = {
  id: QUESTION_ID,
  courseId: 'course-events-1',
  lessonId: LESSON_ID,
  topic: 'Limits',
  difficulty: 2,
  type: 'multiple-choice',
  body: 'lim(x→2) (x²−4)/(x−2) = ?',
  options: ['0', '2', '4', 'Undefined'],
  correctOptionIndex: 2,
  correctAnswer: '4',
  explanation: 'Factor the numerator.',
};

beforeEach(() => {
  storeBackend.useInMemory();
  store.clearAll();
});

afterEach(() => {
  storeBackend.useLocalStorage();
});

// ─── derived evidence rules ────────────────────────────────────────────────────

describe('deriveEvidence', () => {
  it('returns zero observations for a lesson-viewed event', () => {
    const input: EvidenceDerivationInput = {
      event: { id: 'ev-1', kind: 'lesson-viewed', studentId: SID, source: 'student', happenedAt: T0, lessonId: LESSON_ID },
    };
    expect(deriveEvidence(input)).toEqual([]);
  });

  it('returns completion evidence for lesson-completed', () => {
    const input: EvidenceDerivationInput = {
      event: { id: 'ev-2', kind: 'lesson-completed', studentId: SID, source: 'student', happenedAt: T0, lessonId: LESSON_ID, nodeType: 'lesson', nodeId: LESSON_ID },
    };
    const obs = deriveEvidence(input);
    expect(obs.length).toBe(1);
    expect(obs[0].dimension).toBe('completion');
    expect(obs[0].value).toBe(100);
    expect(obs[0].source).toBe('session');
  });

  it('derives response-accuracy and response-time evidence for a correct answer', () => {
    const input: EvidenceDerivationInput = {
      event: { id: 'ev-3', kind: 'question-answered', studentId: SID, source: 'student', happenedAt: T0, nodeId: CONCEPT_ID, nodeType: 'concept', questionId: QUESTION_ID },
      question: QUESTION, correct: true, timeSpentSeconds: 30,
    };
    const obs = deriveEvidence(input);
    const dims = obs.map((o) => o.dimension).sort();
    expect(dims).toContain('responseAccuracy');
    expect(dims).toContain('responseTime');
    expect(obs.find((o) => o.dimension === 'responseAccuracy')!.value).toBe(100);
  });

  it('derives lower accuracy for a wrong answer', () => {
    const input: EvidenceDerivationInput = {
      event: { id: 'ev-4', kind: 'question-answered', studentId: SID, source: 'student', happenedAt: T0, nodeId: CONCEPT_ID, nodeType: 'concept', questionId: QUESTION_ID },
      question: QUESTION, correct: false, timeSpentSeconds: 30,
    };
    const obs = deriveEvidence(input);
    expect(obs.find((o) => o.dimension === 'responseAccuracy')!.value).toBeLessThan(50);
  });

  it('derives quiz-submitted evidence from score', () => {
    const input: EvidenceDerivationInput = {
      event: { id: 'ev-5', kind: 'quiz-submitted', studentId: SID, source: 'assessment', happenedAt: T0, assessmentId: 'quiz-1' },
      score: 85,
    };
    const obs = deriveEvidence(input);
    expect(obs.find((o) => o.dimension === 'quiz')!.value).toBe(85);
  });

  it('returns empty observations for session-started', () => {
    const input: EvidenceDerivationInput = {
      event: { id: 'ev-empty', kind: 'session-started', studentId: SID, source: 'student', happenedAt: T0 },
    };
    expect(deriveEvidence(input)).toEqual([]);
  });

  it('is deterministic: same input produces same output', () => {
    const input: EvidenceDerivationInput = {
      event: { id: 'ev-det', kind: 'question-answered', studentId: SID, source: 'student', happenedAt: T0, nodeId: CONCEPT_ID, nodeType: 'concept', questionId: QUESTION_ID },
      question: QUESTION, correct: true, timeSpentSeconds: 25,
    };
    expect(deriveEvidence(input)).toEqual(deriveEvidence(input));
  });

  it('preserves source label from the event', () => {
    const input: EvidenceDerivationInput = {
      event: { id: 'ev-src', kind: 'question-answered', studentId: SID, source: 'ai-tutor', happenedAt: T0, nodeId: CONCEPT_ID, nodeType: 'concept', questionId: QUESTION_ID },
      question: QUESTION, correct: true, timeSpentSeconds: 30,
    };
    const obs = deriveEvidence(input);
    expect(obs.every((o) => o.source === 'ai-tutor')).toBe(true);
  });
});
