// Phases 17-19: study tools, exam simulator, assessment evidence.
import type { EntityId, Question } from '../domain';
import { store } from '../services/store.ts';
import { learningEvents } from './learning-events.ts';
import { buildTutorContext } from './tutor-context.ts';

export function studyPartnerReply(studentId: EntityId, nowIso: string, message: string): string {
  const ctx = buildTutorContext(studentId, nowIso);
  return `Study partner (${ctx.recentTrend} trend, mastery ${ctx.overallMastery}): let's break down "${message.slice(0, 60)}" into one small step. What do you already know?`;
}

export function prerequisiteCheck(studentId: EntityId, nodeId: EntityId): string {
  void studentId;
  return `Prerequisite check for ${nodeId}: complete weakest prerequisites first, then practice.`;
}

export function microLesson(topic: string): { steps: string[] } {
  return { steps: [`Recall: define ${topic} in one sentence.`, `Example: work one small ${topic} example.`, `Check: explain it back in your own words.`] };
}

export interface ExamBlueprint { topicCoverage: Record<string, number>; difficulty: Record<string, number>; minutes: number; }
export function simulateExam(studentId: EntityId, bank: Question[], blueprint: ExamBlueprint, nowIso: string): { questionIds: string[]; explanation: string } {
  void studentId; void nowIso;
  const ids = bank.slice(0, Math.max(1, Math.min(bank.length, 10))).map((q) => q.id);
  return { questionIds: ids, explanation: `Exam blueprint: ${Object.keys(blueprint.topicCoverage).join(', ') || 'mixed topics'}, ${ids.length} questions, ${blueprint.minutes} min.` };
}

export function recordAssessmentEvidence(input: { studentId: EntityId; question: Question; nodeId: EntityId; correct: boolean; answer: string; seconds: number; nowIso: string }): void {
  learningEvents.recordQuestionAttempt({
    studentId: input.studentId, question: input.question, nodeId: input.nodeId, nodeType: 'concept',
    correct: input.correct, selectedAnswer: input.answer, timeSpentSeconds: input.seconds,
    mode: 'quiz', happenedAt: input.nowIso, clientKey: `assess-${input.question.id}-${input.nowIso}`,
  });
  store.assessments.save({
    id: `assess-${input.question.id}`, title: 'Adaptive assessment', type: 'quiz',
    questionIds: [input.question.id], passingScore: 60, adaptive: true,
  });
}

export const studyToolsEngine = { studyPartnerReply, prerequisiteCheck, microLesson };
export const examEngine = { simulateExam, recordAssessmentEvidence };
