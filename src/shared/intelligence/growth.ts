// Phases 20-23: DNA, career, simulator, goals/recovery.
import type { EntityId, LearningDNA } from '../domain';
import { store } from '../services/store.ts';
import { buildLearningPath } from './learning-path.ts';

export function computeLearningDNA(studentId: EntityId, nowIso: string): LearningDNA {
  const records = store.mastery.listByStudent(studentId);
  const attempts = store.attempts.listByStudent(studentId);
  const avg = records.length ? records.reduce((s, r) => s + r.mastery, 0) / records.length : 0;
  const mistakes = store.mistakes.listByStudent(studentId);
  return {
    studentId,
    learningSpeed: avg >= 70 ? 'faster' : avg >= 45 ? 'average' : 'slower',
    preferredContentType: ['practice'],
    strongestSubjects: records.filter((r) => r.mastered).map((r) => r.nodeId).slice(0, 3),
    weakSubjects: records.filter((r) => r.weak).map((r) => r.nodeId).slice(0, 3),
    consistency: attempts.length >= 10 ? 'high' : attempts.length >= 4 ? 'medium' : 'low',
    difficultyTolerance: avg >= 75 ? 'prefers-challenge' : avg >= 50 ? 'balanced' : 'prefers-easier',
    mistakePatterns: [...new Set(mistakes.map((m) => m.category))].slice(0, 4),
    studyTiming: ['evening'],
    lastComputedAt: nowIso,
  };
}

export function careerReadiness(studentId: EntityId, targetSkills: EntityId[]): { readiness: number; missing: EntityId[]; explanation: string } {
  const missing = targetSkills.filter((s) => (store.mastery.get(studentId, s)?.mastery ?? 0) < 80);
  const readiness = targetSkills.length ? Math.round(((targetSkills.length - missing.length) / targetSkills.length) * 100) : 0;
  return { readiness, missing, explanation: `Career readiness ${readiness}%: ${missing.length} skill(s) below mastery. Guidance only, not a guarantee.` };
}

export function simulateProgress(currentMastery: number, sessionsPerWeek: number, weeks: number): { projected: number; explanation: string } {
  const gain = Math.min(100 - currentMastery, sessionsPerWeek * weeks * 2.5);
  const projected = Math.round(Math.min(100, currentMastery + gain));
  return { projected, explanation: `Estimate: ${currentMastery}→${projected} over ${weeks} weeks at ${sessionsPerWeek}/week. Estimates only.` };
}

export function recoveryPlan(studentId: EntityId, nowIso: string): { summary: string; items: number } {
  const path = buildLearningPath(studentId, nowIso, 6);
  return { summary: `Recovery: ${path.steps.length} prioritized step(s). ${path.explanation}`, items: path.steps.length };
}

export const growthEngine = { computeLearningDNA, careerReadiness, simulateProgress, recoveryPlan };
