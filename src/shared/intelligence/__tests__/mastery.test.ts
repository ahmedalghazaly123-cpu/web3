// ━━━─ LearnPilot Intelligence Test Suite — Part 2: Mastery Engine Quality Gate ━━━─
// Phase 2: deterministic, explainable mastery — not ML, but ML-ready.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { masteryEngine } from '../../services/mastery.ts';
import { store } from '../../services/store.ts';
import { storeBackend } from '../../services/store.ts';
import type { MasteryDimension } from '../../domain';

const SID = 'student-mastery-1';
const CONCEPT_A = 'concept-m-a';
const CONCEPT_B = 'concept-m-b';
const T0 = '2026-03-01T10:00:00.000Z';
const T1 = '2026-03-01T10:05:00.000Z';
const T2 = '2026-03-01T10:10:00.000Z';
const T0_MS = new Date(T0).getTime();
function t(offsetMs: number): string {
  return new Date(T0_MS + offsetMs).toISOString();
}

beforeEach(() => { storeBackend.useInMemory(); store.clearAll(); });
afterEach(() => { storeBackend.useLocalStorage(); });

// ─── evidence ingestion ────────────────────────────────────────────────────────

describe('masteryEngine.ingestEvidence', () => {
  it('creates a mastery record for a new node', () => {
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 80, 'student', T0);
    const r = store.mastery.get(SID, CONCEPT_A);
    expect(r).toBeDefined();
    expect(r!.nodeId).toBe(CONCEPT_A);
    expect(r!.attempts).toBe(1);
  });

  it('accumulates attempts across multiple ingestions', () => {
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 80, 'student', T0);
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 90, 'student', T1);
    expect(store.mastery.get(SID, CONCEPT_A)!.attempts).toBe(2);
  });

  it('supports all documented MasteryDimensions', () => {
    const dims: MasteryDimension[] = [
      'quiz', 'exam', 'responseAccuracy', 'responseTime',
      'repeatedMistakes', 'revisionFrequency', 'completion',
      'learningConsistency', 'difficultyAdjusted',
    ];
    for (const dim of dims) {
      const nodeId = `node-${dim}`;
      masteryEngine.ingestEvidence(SID, nodeId, 'concept', dim, 70, 'student', T0);
      expect(store.mastery.get(SID, nodeId)!.dimensions?.[dim]).toBe(70);
// ─── mastery thresholds ────────────────────────────────────────────────────────

describe('masteryEngine.thresholds', () => {
  it('exposes MASTERY_AT=80, WEAK_BELOW=50, MIN_ATTEMPTS=3, REVIEW_PRIORITY_BELOW=60', () => {
    expect(masteryEngine.thresholds.MASTERY_AT).toBe(80);
    expect(masteryEngine.thresholds.WEAK_BELOW).toBe(50);
    expect(masteryEngine.thresholds.MIN_ATTEMPTS_FOR_CONFIDENCE).toBe(3);
    expect(masteryEngine.thresholds.REVIEW_PRIORITY_BELOW).toBe(60);
  });
});

// ─── mastery flag logic ────────────────────────────────────────────────────────

describe('mastery flags', () => {
  it('does NOT mark mastered with < MIN_ATTEMPTS evidence', () => {
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 90, 'student', T0);
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 90, 'student', T1);
    const r = store.mastery.get(SID, CONCEPT_A)!;
    expect(r.mastery).toBeGreaterThanOrEqual(80);
    expect(r.mastered).toBe(false);
  });

// ─── trend signals ─────────────────────────────────────────────────────────────

describe('mastery trend', () => {
  it('reports improving when mastery rises >2 points', () => {
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 40, 'student', T0);
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 40, 'student', T1);
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 40, 'student', T2);
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 90, 'student', '2026-03-01T10:15:00.000Z');
    expect(store.mastery.get(SID, CONCEPT_A)!.trend).toBe('improving');
  });

  it('reports declining when mastery drops >2 points', () => {
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 90, 'student', T0);
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 90, 'student', T1);
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 90, 'student', T2);
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 30, 'student', '2026-03-01T10:15:00.000Z');
    expect(store.mastery.get(SID, CONCEPT_A)!.trend).toBe('declining');
  });

  it('reports stable when change is within ±2', () => {
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 60, 'student', T0);
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 60, 'student', T1);
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 60, 'student', T2);
    expect(store.mastery.get(SID, CONCEPT_A)!.trend).toBe('stable');
  });
});

// ─── confidence ────────────────────────────────────────────────────────────────

describe('mastery confidence', () => {
  it('starts low with few attempts', () => {
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 80, 'student', T0);
    expect(store.mastery.get(SID, CONCEPT_A)!.confidence).toBeLessThan(50);
  });

  it('grows with more attempts', () => {
    for (let i = 0; i < 5; i++) {
      masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 80, 'student', t(i * 60000));
    }
    expect(store.mastery.get(SID, CONCEPT_A)!.confidence).toBeGreaterThan(60);
  });

  it('grows with distinct dimensions (coverage)', () => {
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'quiz', 80, 'assessment', T0);
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 80, 'student', T1);
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseTime', 80, 'student', T2);
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'difficultyAdjusted', 80, 'student', '2026-03-01T10:15:00.000Z');
    expect(store.mastery.get(SID, CONCEPT_A)!.confidence).toBeGreaterThanOrEqual(70);
  });

  it('is capped at 95', () => {
    for (let i = 0; i < 20; i++) {
      masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 80, 'student', t(i * 60000));
    }
    expect(store.mastery.get(SID, CONCEPT_A)!.confidence).toBeLessThanOrEqual(95);
  });
});

// ─── explainability trail ──────────────────────────────────────────────────────

describe('mastery explainability', () => {
  it('records lastEvidenceNote after each ingestion', () => {
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'quiz', 85, 'assessment', T0);
    const note = store.mastery.get(SID, CONCEPT_A)!.lastEvidenceNote;
    expect(note).toContain('quiz');
    expect(note).toContain('85');
    expect(note).toMatch(/mastery [\d.]+→[\d.]+/);
  });
});

// ─── store operations ──────────────────────────────────────────────────────────

describe('mastery store operations', () => {
  it('lists records by student', () => {
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 80, 'student', T0);
    masteryEngine.ingestEvidence(SID, CONCEPT_B, 'concept', 'responseAccuracy', 60, 'student', T0);
    expect(store.mastery.listByStudent(SID).length).toBe(2);
  });

  it('returns undefined for unknown pair', () => {
    expect(store.mastery.get(SID, 'nonexistent')).toBeUndefined();
  });

  it('clears by student', () => {
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 80, 'student', T0);
    store.mastery.clearByStudent(SID);
    expect(store.mastery.listByStudent(SID)).toHaveLength(0);
  });
});

  it('marks mastered when ≥ MASTERY_AT and ≥ 3 attempts', () => {
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 90, 'student', T0);
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 90, 'student', T1);
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 90, 'student', T2);
    expect(store.mastery.get(SID, CONCEPT_A)!.mastered).toBe(true);
  });

  it('marks weak when < WEAK_BELOW with sufficient evidence', () => {
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 30, 'student', T0);
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 30, 'student', T1);
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 30, 'student', T2);
    const r = store.mastery.get(SID, CONCEPT_A)!;
    expect(r.weak).toBe(true);
    expect(r.mastered).toBe(false);
  });

  it('does NOT mark weak with < MIN_ATTEMPTS (no premature labeling)', () => {
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 20, 'student', T0);
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 20, 'student', T1);
    expect(store.mastery.get(SID, CONCEPT_A)!.weak).toBe(false);
  });
});

    }
  });

  it('persists lastPracticedAt from happenedAt input', () => {
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 80, 'student', T1);
    expect(store.mastery.get(SID, CONCEPT_A)!.lastPracticedAt).toBe(T1);
  });

  it('is deterministic: same inputs ⇒ same record state', () => {
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'quiz', 85, 'assessment', T0);
    const r1 = store.mastery.get(SID, CONCEPT_A)!;
    store.mastery.clearByStudent(SID);
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'quiz', 85, 'assessment', T0);
    const r2 = store.mastery.get(SID, CONCEPT_A)!;
    expect(r2.mastery).toBe(r1.mastery);
    expect(r2.confidence).toBe(r1.confidence);
  });
});
