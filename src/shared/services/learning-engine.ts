// ━━━ Learning Engine — E/F/G/H/I/AK/AL/P + mastery integration ━━━
// Backend-ready pure logic over @shared/services/store. All dates ISO.
// No network. Deterministic. Safe for unit testing.

import type { EntityId, GraphNodeType, MasteryRecord, MistakeCategory, Question } from '../domain';
import { store } from './store.ts';
import { masteryEngine } from './mastery.ts';
import { knowledgeGraph } from './knowledge-graph.ts';

function nowIso(): string { return new Date().toISOString(); }

const FALLBACK: Question[] = [
  { id: 'q-lim-1', topic: 'Limits', difficulty: 1, type: 'multiple-choice', body: 'What is lim(x→2) of (x² − 4)/(x − 2)?', options: ['0', '2', '4', 'Undefined'], correctOptionIndex: 2, correctAnswer: '4', explanation: 'Factor: (x−2)(x+2)/(x−2) = x+2 → 4.' },
  { id: 'q-lim-2', topic: 'Limits', difficulty: 2, type: 'multiple-choice', body: 'lim(x→0) sin(x)/x = ?', options: ['0', '1', '∞', 'Undefined'], correctOptionIndex: 1, correctAnswer: '1', explanation: 'Standard limit equals 1.' },
  { id: 'q-der-1', topic: 'Derivatives', difficulty: 2, type: 'multiple-choice', body: 'd/dx [x³] = ?', options: ['x²', '2x', '3x²', '3x³'], correctOptionIndex: 2, correctAnswer: '3x²', explanation: 'Power rule: 3x².' },
  { id: 'q-der-2', topic: 'Derivatives', difficulty: 3, type: 'multiple-choice', body: "f(x)=5x²+3x−2 → f'(x)?", options: ['5x+3', '10x+3', '10x−2', '5x²+3'], correctOptionIndex: 1, correctAnswer: '10x+3', explanation: '10x+3 by the power rule.' },
  { id: 'q-con-1', topic: 'Continuity', difficulty: 1, type: 'multiple-choice', body: 'Which is continuous everywhere?', options: ['1/x', 'sin(x)', '|x|/x', 'tan(x)'], correctOptionIndex: 1, correctAnswer: 'sin(x)', explanation: 'sin(x) is continuous on the real line.' },
];

function choicesOf(q: Question): string[] { return q.options ?? [q.correctAnswer]; }
function answerOf(q: Question): number { return q.correctOptionIndex ?? 0; }

export const learningEngine = {
  questionBank(courseId?: EntityId): Question[] {
    const stored = store.questions.list();
    const base = stored.length ? stored : FALLBACK;
    return courseId ? base.filter((q) => !q.courseId || q.courseId === courseId) : base;
  },
  choicesOf, answerOf,

  nextQuestion(studentId: EntityId, nodeId: EntityId, topic?: string): Question {
    const rec = store.mastery.get(studentId, nodeId);
    const m = rec?.mastery ?? 50;
    const target = m >= 80 ? 4 : m >= 60 ? 3 : m >= 40 ? 2 : 1;
    const bank = this.questionBank().filter((q) => !topic || q.topic === topic);
    const pool = bank.filter((q) => Math.abs(q.difficulty - target) <= 1);
    const arr = pool.length ? pool : bank.length ? bank : FALLBACK;
    // Deterministic rotation (stable, test-friendly): pick by attempt count, not Math.random.
    const attempts = rec?.attempts ?? 0;
    return arr[attempts % arr.length] ?? FALLBACK[0];
  },

  answer(studentId: EntityId, nodeId: EntityId, nodeType: GraphNodeType, q: Question, choice: number, seconds: number): { correct: boolean; record: MasteryRecord; nextDifficulty: number } {
    const correct = choice === answerOf(q);
    if (!correct) {
      const cat: MistakeCategory = seconds < 5 ? 'careless' : q.difficulty >= 4 ? 'conceptual' : 'calculation';
      store.mistakes.save({
        id: store.uid(), studentId, questionId: q.id, topic: q.topic, category: cat,
        question: q.body, studentAnswer: choicesOf(q)[choice] ?? String(choice),
        correctAnswer: q.correctAnswer, explanation: q.explanation,
        difficulty: q.difficulty, firstSeenAt: nowIso(), lastSeenAt: nowIso(), repetitionCount: 1,
      });
    }
    const record = masteryEngine.recordQuizResult(studentId, nodeId, nodeType, correct ? 100 : 0, seconds, q.difficulty);
    const nextDifficulty = correct && seconds < 20 ? Math.min(5, q.difficulty + 1) : correct ? q.difficulty : Math.max(1, q.difficulty - 1);
    return { correct, record, nextDifficulty };
  },

  dueReviews(studentId: EntityId) {
    return store.reviews.listByStudent(studentId).filter((r) => r.nextReviewAt <= nowIso());
  },

  scheduleReview(studentId: EntityId, nodeId: EntityId, quality: number): void {
    const rec = store.mastery.get(studentId, nodeId);
    const m = rec?.mastery ?? 50;
    const days = quality >= 4 ? (m >= 80 ? 14 : 7) : quality >= 3 ? 3 : 1;
    const existing = store.reviews.listByStudent(studentId).find((r) => r.nodeId === nodeId);
    store.reviews.save({
      id: existing?.id ?? store.uid(), studentId, nodeId, type: 'question',
      prompt: `Review ${nodeId}`, answer: '', difficulty: 2,
      easeFactor: 2.5, intervalDays: days, repetitions: (existing?.repetitions ?? 0) + 1,
      nextReviewAt: new Date(Date.now() + days * 864e5).toISOString(),
      lastReviewedAt: nowIso(), quality,
    });
  },

  dynamicPath(studentId: EntityId, _courseId: EntityId) {
    const all = store.mastery.listByStudent(studentId);
    const mastered = all.filter((r) => r.mastered).map((r) => r.nodeId);
    const weak = all.filter((r) => r.weak).map((r) => r.nodeId);
    const graph = knowledgeGraph.get();
    const lessons = graph.nodes.filter((n) => n.type === 'lesson');
    const next = lessons.filter((l) => !mastered.includes(l.id)).slice(0, 5).map((l) => l.id);
    return { mastered, weak, next, remediation: weak.slice(0, 3) };
  },
};
