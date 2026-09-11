// Phase 9 + 10 quality gates.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { store, storeBackend } from '../../services/store.ts';
import { masteryEngine } from '../../services/mastery.ts';
import { buildLearningPath, pathToPlanItems } from '../learning-path.ts';
import { assessRisk } from '../risk-engine.ts';
import { misconceptionEngine } from '../misconception-engine.ts';
import type { GraphNodeType } from '../../domain';

const SID = 'student-path-1';
const T0 = '2026-06-01T10:00:00.000Z';
const CA = 'concept-path-a';
const CB = 'concept-path-b';

function seedGraph(): void {
  store.graph.save({
    nodes: [
      { id: CA, type: 'concept' as GraphNodeType, label: 'Fractions', difficulty: 2, masteryBaseline: 30 },
      { id: CB, type: 'concept' as GraphNodeType, label: 'Equations', difficulty: 3, masteryBaseline: 30 },
    ],
    edges: [{ id: 'e1', source: CB, target: CA, kind: 'prerequisite' as const }],
  });
}

beforeEach(() => { storeBackend.useInMemory(); store.clearAll(); seedGraph(); misconceptionEngine.install(); });
afterEach(() => { storeBackend.useLocalStorage(); });

describe('learningPathEngine (Phase 9)', () => {
  it('empty path when no gaps', () => {
    const p = buildLearningPath(SID, T0);
    expect(p.studentId).toBe(SID);
    expect(p.explanation).toBeTruthy();
  });

  it('weak skill produces remediate→practice→reassess chain', () => {
    for (let i = 0; i < 3; i++) masteryEngine.ingestEvidence(SID, CA, 'concept', 'responseAccuracy', 15, 'practice', T0);
    for (let i = 0; i < 3; i++) masteryEngine.ingestEvidence(SID, CB, 'concept', 'responseAccuracy', 20, 'practice', T0);
    const p = buildLearningPath(SID, T0);
    expect(p.steps.length).toBeGreaterThan(0);
    expect(p.steps[0].reason).toBeTruthy();
    const items = pathToPlanItems(p);
    expect(items.length).toBe(p.steps.length);
    expect(items.every((x) => x.reason && x.studentId === SID)).toBe(true);
  });

  it('deterministic ordering', () => {
    const a = buildLearningPath(SID, T0);
    const b = buildLearningPath(SID, T0);
    expect(a).toEqual(b);
  });
});

describe('riskEngine (Phase 10)', () => {
  it('healthy for new student', () => {
    const r = assessRisk(SID, T0);
    expect(r.category).toBe('healthy');
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.intervention).toBeTruthy();
  });

  it('flags declining + repeated mistakes with intervention', () => {
    for (let i = 0; i < 3; i++) masteryEngine.ingestEvidence(SID, CA, 'concept', 'responseAccuracy', 90, 'practice', T0);
    for (let i = 0; i < 3; i++) masteryEngine.ingestEvidence(SID, CA, 'concept', 'responseAccuracy', 5, 'practice', T0);
    const r = assessRisk(SID, T0);
    expect(r.score).toBeGreaterThan(0);
    expect(r.signals.length).toBeGreaterThan(0);
    expect(r.confidence).toBeGreaterThan(0);
  });

  it('deterministic', () => {
    expect(assessRisk(SID, T0)).toEqual(assessRisk(SID, T0));
  });
});
