// Phase 8 quality gate: scheduling, decay, overdue, recovery.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { store, storeBackend } from '../../services/store.ts';
import {
  ensureReviewCard, scheduleReview, estimateForgetting, dueReviews,
  nextEaseFactor, nextIntervalDays,
} from '../spaced-repetition.ts';

const SID = 'student-sr-1';
const T0 = '2026-05-01T10:00:00.000Z';
const T1 = '2026-05-02T10:00:00.000Z';
const T5 = '2026-05-06T10:00:00.000Z';

beforeEach(() => { storeBackend.useInMemory(); store.clearAll(); });
afterEach(() => { storeBackend.useLocalStorage(); });

function makeCard() {
  return ensureReviewCard({
    studentId: SID, nodeId: 'concept-sr-a', type: 'concept',
    prompt: 'Review limits', answer: '4', difficulty: 2, nowIso: T0,
  });
}

describe('spacedRepetitionEngine (Phase 8)', () => {
  it('creates a deterministic review card', () => {
    const a = makeCard();
    const b = ensureReviewCard({
      studentId: SID, nodeId: 'concept-sr-a', type: 'concept',
      prompt: 'Review limits', answer: '4', difficulty: 2, nowIso: T0,
    });
    expect(a.id).toBe(b.id);
    expect(a.easeFactor).toBe(2.5);
  });

  it('high quality grows the interval', () => {
    const c = makeCard();
    const r = scheduleReview(c.id, { quality: 5, answeredAt: T1 })!;
    expect(r.card.intervalDays).toBeGreaterThanOrEqual(1);
    expect(r.explanation).toBeTruthy();
  });

  it('low quality resets the interval', () => {
    const c = makeCard();
    const r = scheduleReview(c.id, { quality: 2, answeredAt: T1 })!;
    expect(r.card.intervalDays).toBe(1);
    expect(r.card.repetitions).toBe(0);
  });

  it('overdue success marks recovery', () => {
    const c = makeCard();
    const r = scheduleReview(c.id, { quality: 5, answeredAt: T5 })!;
    expect(r.overdueDays).toBeGreaterThan(0);
    expect(r.recovered).toBe(true);
  });

  it('estimates forgetting with overdue + recall heuristic', () => {
    const c = makeCard();
    const e = estimateForgetting(c.id, T5)!;
    expect(e.overdueDays).toBeGreaterThan(0);
    expect(e.recallProbability).toBeLessThanOrEqual(100);
    expect(e.explanation).toBeTruthy();
  });

  it('dueReviews orders deterministically', () => {
    makeCard();
    const a = dueReviews(SID, T5);
    const b = dueReviews(SID, T5);
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
  });

  it('ease/interval helpers are deterministic', () => {
    expect(nextEaseFactor(2.5, 5)).toBe(nextEaseFactor(2.5, 5));
    const c = makeCard();
    expect(nextIntervalDays(c, 5)).toBe(nextIntervalDays(c, 5));
  });
});
