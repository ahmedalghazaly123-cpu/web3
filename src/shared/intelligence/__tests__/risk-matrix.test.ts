// Risk test matrix (Phase 10) — proves canonical risk engine behavior.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { store, storeBackend } from '../../services/store.ts';
import { riskEngine } from '../risk-engine.ts';

const SID = 'student-risk-1';
const T0 = '2026-06-04T10:00:00.000Z';

beforeEach(() => { storeBackend.useInMemory(); store.clearAll(); });
afterEach(() => { storeBackend.useLocalStorage(); });

describe('risk test matrix', () => {
  it('healthy learner has low risk', () => {
    const r = riskEngine.assessRisk(SID, T0);
    expect(r.category).toBe('healthy');
    expect(r.score).toBe(0);
    expect(r.signals.length).toBe(0);
  });

  it('struggling learner has increased risk', () => {
    store.mastery.save({
      id: 'm1', studentId: SID, nodeId: 'concept-1', nodeType: 'concept',
      mastery: 30, attempts: 5, lastPracticedAt: T0, trend: 'declining',
      weak: true, mastered: false, updatedAt: T0,
    });
    store.mistakes.save({
      id: 'mist-1', studentId: SID, topic: 'Limits', category: 'conceptual',
      question: 'q', studentAnswer: 'a', correctAnswer: 'b', explanation: 'e',
      difficulty: 3, firstSeenAt: T0, lastSeenAt: T0, repetitionCount: 3,
      resolved: false,
    });
    const r = riskEngine.assessRisk(SID, T0);
    expect(r.score).toBeGreaterThanOrEqual(18);
    expect(['watch', 'needs-attention', 'urgent']).toContain(r.category);
    expect(r.signals.some((s) => s.signal === 'declining-mastery')).toBe(true);
    expect(r.signals.some((s) => s.signal === 'repeated-mistakes')).toBe(true);
  });

  it('inactive learner has increased risk', () => {
    store.mastery.save({
      id: 'm2', studentId: SID, nodeId: 'concept-2', nodeType: 'concept',
      mastery: 60, attempts: 3, lastPracticedAt: '2026-05-01T00:00:00.000Z',
      trend: 'stable', weak: false, mastered: false, updatedAt: T0,
    });
    const r = riskEngine.assessRisk(SID, T0);
    expect(r.signals.some((s) => s.signal === 'inactivity')).toBe(true);
  });

  it('recovered learner risk decreases after improved evidence', () => {
    store.mastery.save({
      id: 'm3', studentId: SID, nodeId: 'concept-3', nodeType: 'concept',
      mastery: 40, attempts: 5, lastPracticedAt: '2026-05-01T00:00:00.000Z',
      trend: 'declining', weak: true, mastered: false, updatedAt: T0,
    });
    const r1 = riskEngine.assessRisk(SID, T0);
    expect(r1.score).toBeGreaterThan(0);

    store.mastery.save({
      id: 'm3', studentId: SID, nodeId: 'concept-3', nodeType: 'concept',
      mastery: 85, attempts: 8, lastPracticedAt: T0,
      trend: 'improving', weak: false, mastered: true, updatedAt: T0,
    });
    const r2 = riskEngine.assessRisk(SID, T0);
    expect(r2.score).toBeLessThan(r1.score);
  });

  it('duplicate evidence does not incorrectly inflate risk', () => {
    store.mastery.save({
      id: 'm4', studentId: SID, nodeId: 'concept-4', nodeType: 'concept',
      mastery: 50, attempts: 2, lastPracticedAt: T0,
      trend: 'stable', weak: false, mastered: false, updatedAt: T0,
    });
    store.mistakes.save({
      id: 'mist-2', studentId: SID, topic: 'Algebra', category: 'calculation',
      question: 'q', studentAnswer: 'a', correctAnswer: 'b', explanation: 'e',
      difficulty: 2, firstSeenAt: T0, lastSeenAt: T0, repetitionCount: 1,
      resolved: false,
    });
    const r1 = riskEngine.assessRisk(SID, T0);
    const r2 = riskEngine.assessRisk(SID, T0);
    expect(r2.score).toBe(r1.score);
    expect(r2.category).toBe(r1.category);
  });

  it('determinism: same evidence produces same result', () => {
    store.mastery.save({
      id: 'm5', studentId: SID, nodeId: 'concept-5', nodeType: 'concept',
      mastery: 20, attempts: 4, lastPracticedAt: '2026-05-10T00:00:00.000Z',
      trend: 'declining', weak: true, mastered: false, updatedAt: T0,
    });
    const r1 = riskEngine.assessRisk(SID, T0);
    const r2 = riskEngine.assessRisk(SID, T0);
    expect(r1).toEqual(r2);
  });

  it('risk score is bounded 0-100', () => {
    for (let i = 0; i < 10; i++) {
      store.mastery.save({
        id: `mbad-${i}`, studentId: SID, nodeId: `concept-bad-${i}`, nodeType: 'concept',
        mastery: 10, attempts: 10, lastPracticedAt: '2026-04-01T00:00:00.000Z',
        trend: 'declining', weak: true, mastered: false, updatedAt: T0,
      });
    }
    const r = riskEngine.assessRisk(SID, T0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});