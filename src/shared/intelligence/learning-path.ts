// Phase 9: Dynamic Learning Paths (deterministic, explainable).
import type { EntityId, PlanItem } from '../domain';
import { store } from '../services/store.ts';
import { knowledgeGraph } from '../services/knowledge-graph.ts';
import { masteryEngine } from '../services/mastery.ts';
import { weakestPrerequisite, nextLearnable } from './graph-intelligence.ts';
import { dueReviews } from './spaced-repetition.ts';

export type PathStepKind = 'remediate-prerequisite' | 'practice' | 'review' | 'learn' | 'reassess' | 'challenge';

export interface PathStep {
  rank: number;
  kind: PathStepKind;
  nodeId: EntityId;
  label: string;
  reason: string;
  estimatedMinutes: number;
}

export interface LearningPath {
  studentId: EntityId;
  computedAt: string;
  steps: PathStep[];
  explanation: string;
}

function est(kind: PathStepKind, difficulty?: number): number {
  if (kind === 'review') return 10;
  if (kind === 'practice') return 20;
  if (kind === 'remediate-prerequisite') return 25;
  if (kind === 'reassess') return 15;
  if (kind === 'challenge') return 25;
  return 20 + Math.min(10, (difficulty ?? 2) * 2);
}

export function buildLearningPath(studentId: EntityId, nowIso: string, maxSteps = 8): LearningPath {
  const steps: PathStep[] = [];
  const seen = new Set<EntityId>();
  const push = (kind: PathStepKind, nodeId: EntityId, reason: string) => {
    if (seen.has(`${kind}:${nodeId}`) || steps.length >= maxSteps) return;
    seen.add(`${kind}:${nodeId}`);
    const node = knowledgeGraph.getNode(nodeId);
    steps.push({
      rank: steps.length, kind, nodeId,
      label: node?.label ?? nodeId, reason,
      estimatedMinutes: est(kind, node?.difficulty),
    });
  };

  // 1. overdue reviews first
  for (const card of dueReviews(studentId, nowIso).slice(0, 2)) {
    const nid = card.nodeId ?? card.questionId ?? card.id;
    push('review', nid, `Spaced review is due (interval ${card.intervalDays}d, repetitions ${card.repetitions}).`);
  }

  // 2. weak skills → missing prerequisite → remediate → practice → reassess
  const weak = store.mastery.listByStudent(studentId)
    .filter((r) => r.weak)
    .sort((a, b) => a.mastery - b.mastery || a.nodeId.localeCompare(b.nodeId))
    .slice(0, 3);
  for (const r of weak) {
    const wp = weakestPrerequisite(studentId, r.nodeId);
    if (wp) push('remediate-prerequisite', wp.nodeId,
      `Weak skill "${knowledgeGraph.getNode(r.nodeId)?.label ?? r.nodeId}" (mastery ${Math.round(r.mastery)}) needs prerequisite "${knowledgeGraph.getNode(wp.nodeId)?.label ?? wp.nodeId}" (mastery ${Math.round(wp.mastery)}).`);
    push('practice', r.nodeId, `Targeted practice: mastery ${Math.round(r.mastery)} is below the ${masteryEngine.thresholds.WEAK_BELOW} weak threshold.`);
    push('reassess', r.nodeId, `Reassess after practice to confirm recovery on "${knowledgeGraph.getNode(r.nodeId)?.label ?? r.nodeId}".`);
  }

  // 3. unstable (low-confidence) → reassess
  for (const r of store.mastery.listByStudent(studentId)
    .filter((x) => !x.weak && (x.confidence ?? 0) < 50 && x.attempts > 0).slice(0, 2)) {
    push('reassess', r.nodeId, `Mastery estimate ${Math.round(r.mastery)} rests on thin evidence (confidence ${r.confidence ?? 0}) — reassess.`);
  }

  // 4. next learnable concepts
  for (const n of nextLearnable(studentId, 3)) {
    push('learn', n.id, `Prerequisite-ready: "${n.label}" has no unmet prerequisites.`);
  }

  // 5. mastered → challenge
  const top = store.mastery.listByStudent(studentId).filter((r) => r.mastered)
    .sort((a, b) => b.mastery - a.mastery)[0];
  if (top && top.mastery >= 90) {
    const next = knowledgeGraph.getDependents(top.nodeId)[0] ?? top.nodeId;
    push('challenge', next, `"${knowledgeGraph.getNode(top.nodeId)?.label ?? top.nodeId}" mastered at ${Math.round(top.mastery)} — stretch to "${knowledgeGraph.getNode(next)?.label ?? next}".`);
  }

  const explanation = steps.length
    ? `Path of ${steps.length} step(s): ` + steps.map((s) => `${s.kind}→${s.label}`).join('; ') + '.'
    : 'No blocking gaps detected — continue current material.';
  return { studentId, computedAt: nowIso, steps, explanation };
}

export function pathToPlanItems(path: LearningPath): PlanItem[] {
  return path.steps.map((s, i) => ({
    id: `path-${path.studentId}-${i}-${s.nodeId}`,
    studentId: path.studentId,
    kind: s.kind === 'review' ? 'revision' : s.kind === 'remediate-prerequisite' ? 'remediation' : s.kind === 'challenge' ? 'challenge' : s.kind === 'learn' ? 'lesson' : 'quiz',
    title: `${s.kind}: ${s.label}`,
    estimatedMinutes: s.estimatedMinutes,
    scheduledFor: path.computedAt,
    priority: i < 2 ? 'high' : i < 4 ? 'medium' : 'low',
    status: 'pending',
    reason: s.reason,
    generatedBy: 'prerequisite',
  }));
}

export const learningPathEngine = { buildLearningPath, pathToPlanItems };
