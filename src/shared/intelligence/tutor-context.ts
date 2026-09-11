// Phase 12: AI Tutor foundation — structured context builder (no LLM here).
import type { EntityId } from '../domain';
import { store } from '../services/store.ts';
import { computeStudentKnowledgeState } from './student-knowledge-model.ts';
import { misconceptionEngine } from './misconception-engine.ts';

export interface TutorContext {
  studentId: EntityId; lessonId?: EntityId;
  overallMastery: number; confidence: number;
  weakConcepts: EntityId[]; openMistakes: number;
  recentTrend: string; nextSteps: string[];
  systemPrompt: string;
}

export function buildTutorContext(studentId: EntityId, nowIso: string, lessonId?: EntityId): TutorContext {
  const state = computeStudentKnowledgeState(studentId, { nowIso });
  const summary = misconceptionEngine.summary(studentId);
  const weakConcepts = state.weak.nodeIds.slice(0, 5);
  const nextSteps = state.learnNext.nodeIds.slice(0, 3);
  const recentTrend = state.deteriorating.records.length > 0 ? 'declining'
    : state.improving.records.length > 0 ? 'improving' : 'stable';
  const systemPrompt =
    `You are LearnPilot AI Tutor. Student mastery ${state.overallMastery} (confidence ${state.confidence}). ` +
    `Weak: ${weakConcepts.join(', ') || 'none'}. Open mistakes: ${summary.totalOpen}. ` +
    `Trend: ${recentTrend}. Prefer hints + Socratic questions before solutions. ` +
    `Correct misconceptions explicitly. Never invent mastery data.`;
  return {
    studentId, lessonId, overallMastery: state.overallMastery, confidence: state.confidence,
    weakConcepts, openMistakes: summary.totalOpen, recentTrend, nextSteps, systemPrompt,
  };
}

export function hintFor(questionId: EntityId, attemptCount: number): string {
  const q = store.questions.get(questionId);
  if (!q) return 'Re-read the question and identify what is being asked.';
  if (attemptCount <= 0) return `Hint: recall the definition behind "${q.topic}" before computing.`;
  if (attemptCount === 1) return `Hint: ${q.explanation.split('.')[0]}. Try one step at a time.`;
  return `Guided step: ${q.explanation}`;
}

export const tutorContextEngine = { buildTutorContext, hintFor };
