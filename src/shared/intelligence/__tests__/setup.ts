// Shared deterministic fixtures for intelligence tests (in-memory backend).
import { beforeEach, afterEach } from 'vitest';
import { storeBackend } from '../../services/store.ts';

export const SID = 'student-test-1';
export const T0 = '2026-01-10T10:00:00.000Z';
export const T1 = '2026-01-10T10:05:00.000Z';

export const Q = {
  id: 'q-test-1',
  topic: 'Limits',
  difficulty: 2,
  type: 'multiple-choice',
  body: 'lim(x→2) (x²−4)/(x−2) = ?',
  options: ['0', '2', '4', 'Undefined'],
  correctOptionIndex: 2,
  correctAnswer: '4',
  explanation: 'Factor the numerator.',
} as const;

beforeEach(() => {
  storeBackend.useInMemory();
});

afterEach(() => {
  storeBackend.useLocalStorage();
});
