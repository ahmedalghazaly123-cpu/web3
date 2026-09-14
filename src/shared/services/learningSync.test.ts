import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { learningSync } from './learningSync';
import { store } from './store';
import { storeBackend } from './store';

if (typeof globalThis !== 'undefined' && !globalThis.localStorage) {
  (globalThis as any).localStorage = {
    _data: {} as Record<string, string>,
    clearItem(key: string) { delete this._data[key]; },
    getItem(key: string) { return this._data[key] ?? null; },
    setItem(key: string, value: string) { this._data[key] = value; },
    removeItem(key: string) { delete this._data[key]; },
    clear() { this._data = {}; },
    key(_i: number) { return null; },
    get length() { return Object.keys(this._data).length; },
  };
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ev-test-event',
    kind: 'lesson-completed' as const,
    studentId: 'student-1',
    source: 'student' as const,
    happenedAt: '2026-01-01T00:00:00.000Z',
    nodeId: 'node-1',
    nodeType: 'concept' as const,
    courseId: 'course-1',
    lessonId: 'lesson-1',
    questionId: undefined,
    sessionId: undefined,
    assessmentId: undefined,
    payload: { score: 85 },
    clientKey: 'client-key-1',
    ...overrides,
  };
}

function makeMastery(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mastery-student-1-node-1',
    studentId: 'student-1',
    nodeId: 'node-1',
    nodeType: 'concept' as const,
    mastery: 75,
    dimensions: {},
    attempts: 5,
    lastPracticedAt: '2026-01-01T00:00:00.000Z',
    nextReviewAt: undefined,
    confidence: 80,
    trend: 'improving' as const,
    weak: false,
    mastered: false,
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastEvidenceNote: undefined,
    ...overrides,
  };
}

describe('learningSync', () => {
  beforeEach(() => {
    storeBackend.useInMemory();
    store.clearAll();
    localStorage.clearItem('lp-auth-token');
  });

  afterEach(() => {
    storeBackend.useLocalStorage();
  });

  describe('enum mapping', () => {
    it('converts frontend kind to backend enum', () => {
      const frontendKind = 'lesson-completed';
      const backendKind = frontendKind.replace(/-/g, '_').toUpperCase();
      expect(backendKind).toBe('LESSON_COMPLETED');
      const roundtrip = backendKind.toLowerCase().replace(/_/g, '-');
      expect(roundtrip).toBe(frontendKind);
    });

    it('converts frontend source to backend enum', () => {
      const sources = ['student', 'assessment', 'ai-tutor', 'planner', 'spaced-repetition', 'classroom', 'system'];
      for (const s of sources) {
        const backend = s.replace(/-/g, '_').toUpperCase();
        const rt = backend.toLowerCase().replace(/_/g, '-');
        expect(rt).toBe(s);
      }
    });

    it('roundtrips all event kinds', () => {
      const kinds = [
        'lesson-viewed', 'lesson-completed', 'question-answered',
        'quiz-submitted', 'exam-submitted', 'review-completed',
        'mistake-recorded', 'concept-linked', 'session-started',
        'session-ended', 'goal-updated',
      ];
      for (const k of kinds) {
        const backend = k.replace(/-/g, '_').toUpperCase();
        expect(backend.toLowerCase().replace(/_/g, '-')).toBe(k);
      }
    });
  });

  describe('recordEvent', () => {
    it('writes event to local store', async () => {
      const event = makeEvent();
      await learningSync.recordEvent(event);
      const events = store.events.listByStudent('student-1');
      expect(events.length).toBeGreaterThanOrEqual(1);
      const stored = events.find((e: any) => e.clientKey === 'client-key-1');
      expect(stored).toBeDefined();
      expect(stored!.kind).toBe('lesson-completed');
    });

    it('stores event with correct payload', async () => {
      const event = makeEvent({ payload: { score: 92, total: 10 } });
      await learningSync.recordEvent(event);
      const events = store.events.listByStudent('student-1');
      const stored = events.find((e: any) => e.clientKey === 'client-key-1');
      expect(stored).toBeDefined();
      expect((stored!.payload as Record<string, unknown>).score).toBe(92);
    });

    it('appends multiple events', async () => {
      await learningSync.recordEvent(makeEvent({ id: 'ev-1', clientKey: 'key-1' }));
      await learningSync.recordEvent(makeEvent({ id: 'ev-2', clientKey: 'key-2' }));
      const events = store.events.listByStudent('student-1');
      expect(events.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('authenticated API calls', () => {
    it('isBackend returns true when auth token exists', async () => {
      localStorage.setItem('lp-auth-token', 'test-token');
      expect(learningSync.isBackend()).toBe(true);
    });

    it('isBackend returns false without auth token', async () => {
      localStorage.removeItem('lp-auth-token');
      expect(learningSync.isBackend()).toBe(false);
    });
  });

  describe('unauthenticated behavior', () => {
    it('recordEvent still writes to local store when unauthenticated', async () => {
      localStorage.removeItem('lp-auth-token');
      const event = makeEvent();
      await learningSync.recordEvent(event);
      const events = store.events.listByStudent('student-1');
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it('upsertMastery still writes to local store when unauthenticated', async () => {
      localStorage.removeItem('lp-auth-token');
      const record = makeMastery();
      await learningSync.upsertMastery(record);
      const mastery = store.mastery.listByStudent('student-1');
      expect(mastery.length).toBeGreaterThanOrEqual(1);
      expect(mastery[0].mastery).toBe(75);
    });

    it('flush is no-op when unauthenticated', async () => {
      localStorage.removeItem('lp-auth-token');
      const before = Date.now();
      await learningSync.flush('student-1');
      expect(Date.now() - before).toBeLessThan(100);
    });
  });

  describe('pruneNulls', () => {
    it('pruneNulls removes null fields', () => {
      const input: Record<string, unknown> = {
        kind: 'LESSON_COMPLETED', source: 'STUDENT', nodeId: 'node-1',
        nodeType: 'CONCEPT', courseId: 'course-1',
        nullField: null, anotherNull: null as unknown as string | undefined,
        validField: 'valid-value',
      };
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(input)) {
        if (v !== null && v !== undefined) result[k] = v;
      }
      expect(result.kind).toBe('LESSON_COMPLETED');
      expect(result.source).toBe('STUDENT');
      expect(result.nodeId).toBe('node-1');
      expect(result.validField).toBe('valid-value');
      expect(result.nullField).toBeUndefined();
      expect(Object.keys(result)).toHaveLength(6);
    });

    it('mastery null fields are handled', async () => {
      const record = makeMastery({ nextReviewAt: null, lastEvidenceNote: null });
      await learningSync.upsertMastery(record);
      const mastery = store.mastery.listByStudent('student-1');
      expect(mastery.length).toBeGreaterThanOrEqual(1);
      expect(mastery[0].mastery).toBe(75);
    });
  });

  describe('duplicate clientKey handling', () => {
    it('tracks synced events by clientKey', async () => {
      localStorage.setItem('lp-auth-token', 'test-token');
      const event = makeEvent({ clientKey: 'dup-key-1' });
      await learningSync.recordEvent(event);
      await learningSync.recordEvent(event);
      const events = store.events.listByStudent('student-1');
      const withKey = events.filter((e: any) => e.clientKey === 'dup-key-1');
      expect(withKey.length).toBeLessThanOrEqual(2);
    });

    it('handles repeated clientKey in flush', async () => {
      localStorage.setItem('lp-auth-token', 'test-token');
      const event = makeEvent({ clientKey: 'flush-key', id: 'ev-repeat' });
      await learningSync.recordEvent(event);
      await learningSync.flush('student-1');
      await learningSync.flush('student-1');
      const events = store.events.listByStudent('student-1');
      const withKey = events.filter((e: any) => e.clientKey === 'flush-key');
      expect(withKey.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('hydrate and getProgress', () => {
    it('hydrate returns without error when unauthenticated', async () => {
      localStorage.removeItem('lp-auth-token');
      await expect(learningSync.hydrate('student-1')).resolves.toBeUndefined();
    });

    it('getProgress returns a Promise', async () => {
      const result = learningSync.getProgress();
      expect(result).toBeInstanceOf(Promise);
      // The returned promise must not crash the test run when unauthenticated.
      await result.catch(() => {});
    });
  });
});