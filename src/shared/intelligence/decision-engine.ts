// ━━━─ LearnPilot Learning Intelligence — Phase 6: Adaptive Decision Engine ━━━─
// Every recommendation is EXPLAINED: action + target + priority + reason +
// confidence + evidence + expected outcome. No unexplained randomness.
//
// Decisions: CONTINUE, PRACTICE, REVIEW, REMEDIATE, RETURN_TO_PREREQUISITE,
//            SKIP, CHALLENGE, REASSESS
// Priority order is deterministic; ties break by nodeId for stable output.

import type { EntityId, GraphNode } from '../domain';
import { store } from '../services/store.ts';
import { masteryEngine } from '../services/mastery.ts';
import { knowledgeGraph } from '../services/knowledge-graph.ts';
import { weakestPrerequisite } from './graph-intelligence.ts';

export type DecisionAction =
  | 'CONTINUE' | 'PRACTICE' | 'REVIEW' | 'REMEDIATE'
  | 'RETURN_TO_PREREQUISITE' | 'SKIP' | 'CHALLENGE' | 'REASSESS';

export type DecisionPriority = 'critical' | 'high' | 'medium' | 'low';

export interface AdaptiveDecision {
  id: EntityId;
  action: DecisionAction;
  targetNodeId: EntityId;
  targetLabel: string;
  priority: DecisionPriority;
  /** The reason — plain language, evidence-based (English; UI localizes action labels). */
  reason: string;
  reasonAr?: string;
  confidence: number; // 0-100
  evidence: string[]; // deterministic evidence trail
  relatedSkillIds: EntityId[];
  expectedOutcome: string;
  /** Deterministic sort key: lower = more urgent. */
  rank: number;
}

export interface DecisionContextInput {
  studentId: EntityId;
  /** Focus node the student is currently working on (optional). */
  currentNodeId?: EntityId;
  nowIso: string;
}

const PRIORITY_RANK: Record<DecisionPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/** Produce the best next decision for a student (deterministic). */
export function decideNext(input: DecisionContextInput): AdaptiveDecision | undefined {
  return decideAll(input)[0];
}

/** Produce the full ranked decision list (deterministic ordering). */
export function decideAll(input: DecisionContextInput): AdaptiveDecision[] {
  const { studentId, currentNodeId, nowIso } = input;
  const decisions: AdaptiveDecision[] = [];
  let seq = 0;
  const push = (d: Omit<AdaptiveDecision, 'id' | 'rank'>) => {
    decisions.push({
      ...d,
      id: `dec-${studentId}-${d.action}-${d.targetNodeId}-${seq++}`,
      rank: PRIORITY_RANK[d.priority] * 1000 + seq,
    });
  };

  // ── 1. due reviews (spaced repetition has first claim) ──
  const due = store.reviews.listDue(studentId, nowIso);
  if (due.length > 0) {
    const card = due[0];
    const overdueDays = Math.max(
      0,
      Math.round((new Date(nowIso).getTime() - new Date(card.nextReviewAt).getTime()) / 86_400_000)
    );
    push({
      action: 'REVIEW',
      targetNodeId: card.nodeId ?? card.id,
      targetLabel: card.prompt,
      priority: overdueDays >= 7 ? 'high' : 'medium',
      reason: `Spaced repetition review is due${overdueDays > 0 ? ` (${overdueDays} day(s) overdue)` : ''} — recall decays without retrieval practice.`,
      confidence: 90,
      evidence: [`review card ${card.id}: interval ${card.intervalDays}d, repetitions ${card.repetitions}, last quality ${card.quality ?? 'n/a'}`],
      relatedSkillIds: card.nodeId ? [card.nodeId] : [],
      expectedOutcome: 'Strengthened recall; interval grows on success (SM-2).',
    });
  }

  // ── 2. prerequisite remediation for in-progress work ──
  const inProgress = store.mastery.listByStudent(studentId).filter((r) => !r.mastered && !r.weak);
  const focusPool = currentNodeId
    ? [store.mastery.get(studentId, currentNodeId), ...inProgress].filter(Boolean)
    : inProgress;
  const remediated = new Set<EntityId>();
  for (const rec of focusPool as MasteryRecordLike[]) {
    const w = weakestPrerequisite(studentId, rec.nodeId);
    if (w && !remediated.has(w.nodeId)) {
      remediated.add(w.nodeId);
      push({
        action: 'RETURN_TO_PREREQUISITE',
        targetNodeId: w.nodeId,
        targetLabel: knowledgeGraph.getNode(w.nodeId)?.label ?? w.nodeId,
        priority: 'high',
        reason: `Continue toward "${knowledgeGraph.getNode(rec.nodeId)?.label ?? rec.nodeId}" only after fixing prerequisite "${w.nodeId}" — its mastery is ${Math.round(w.mastery)} vs required ${Math.round(w.baseline)}.`,
        confidence: 80,
        evidence: [
          `prerequisite ${w.nodeId} mastery ${Math.round(w.mastery)} < baseline ${Math.round(w.baseline)}`,
          `blocks ${rec.nodeId}`,
        ],
        relatedSkillIds: [w.nodeId, rec.nodeId],
        expectedOutcome: 'Unblocked progress; future failures on this concept become less likely.',
      });
    }
  }
  // ── 3. weak concepts → practice ──
  const T = masteryEngine.thresholds;
  const weakRecords = store.mastery
    .listByStudent(studentId)
    .filter((r) => r.weak)
    .sort((a, b) => a.mastery - b.mastery);
  for (const r of weakRecords.slice(0, 3)) {
    push({
      action: 'PRACTICE',
      targetNodeId: r.nodeId,
      targetLabel: knowledgeGraph.getNode(r.nodeId)?.label ?? r.nodeId,
      priority: r.mastery < 30 ? 'critical' : 'high',
      reason: `Mastery on "${knowledgeGraph.getNode(r.nodeId)?.label ?? r.nodeId}" is ${Math.round(r.mastery)} (below ${T.WEAK_BELOW}) across ${r.attempts} attempt(s)${r.lastEvidenceNote ? ` — latest: ${r.lastEvidenceNote}` : ''}.`,
      confidence: Math.max(60, r.confidence ?? 60),
      evidence: [`mastery ${Math.round(r.mastery)}`, `attempts ${r.attempts}`, `trend ${r.trend ?? 'unknown'}`],
      relatedSkillIds: [r.nodeId],
      expectedOutcome: 'Raise mastery above the weak threshold through targeted practice.',
    });
  }

  // ── 4. adequate mastery on thin evidence → reassess ──
  for (const r of store.mastery
    .listByStudent(studentId)
    .filter((r) => !r.weak && r.mastery >= T.MASTERY_AT - 15 && (r.confidence ?? 100) < 50)
    .slice(0, 2)) {
    push({
      action: 'REASSESS',
      targetNodeId: r.nodeId,
      targetLabel: knowledgeGraph.getNode(r.nodeId)?.label ?? r.nodeId,
      priority: 'medium',
      reason: `Mastery estimate ${Math.round(r.mastery)} rests on thin evidence (${r.attempts} attempt(s), confidence ${r.confidence ?? 0}) — a short reassessment will confirm or correct it.`,
      confidence: 70,
      evidence: [`confidence ${r.confidence ?? 0} < 50`, `attempts ${r.attempts}`],
      relatedSkillIds: [r.nodeId],
      expectedOutcome: 'Higher-confidence mastery estimate; better downstream decisions.',
    });
  }

  // ── 5. mastered → challenge (or SKIP forward when dependents exist) ──
  const mastered = store.mastery
    .listByStudent(studentId)
    .filter((r) => r.mastered)
    .sort((a, b) => b.mastery - a.mastery);
  if (mastered.length > 0 && mastered[0].mastery >= 90) {
    const dependents = knowledgeGraph.getDependents(mastered[0].nodeId);
    const nextNodeId = dependents[0];
    push({
      action: 'CHALLENGE',
      targetNodeId: nextNodeId ?? mastered[0].nodeId,
      targetLabel:
        knowledgeGraph.getNode(nextNodeId ?? mastered[0].nodeId)?.label ??
        String(nextNodeId ?? mastered[0].nodeId),
      priority: 'low',
      reason: `"${knowledgeGraph.getNode(mastered[0].nodeId)?.label ?? mastered[0].nodeId}" is mastered at ${Math.round(mastered[0].mastery)} — difficulty can rise without risking foundations.`,
      confidence: 85,
      evidence: [
        `mastery ${Math.round(mastered[0].mastery)} ≥ 90`,
        `dependents: ${dependents.slice(0, 3).join(', ') || 'none in graph'}`,
      ],
      relatedSkillIds: [mastered[0].nodeId],
      expectedOutcome: 'Maintained engagement; evidence that mastery holds at higher difficulty.',
    });
  }

  // ── 6. default: continue on the current focus ──
  const continueNode: GraphNode | undefined = currentNodeId
    ? knowledgeGraph.getNode(currentNodeId)
    : undefined;
  const focusRecord = currentNodeId ? store.mastery.get(studentId, currentNodeId) : undefined;
  push({
    action: 'CONTINUE',
    targetNodeId: continueNode?.id ?? 'course-calculus-1',
    targetLabel: continueNode?.label ?? 'Current course',
    priority: 'low',
    reason: focusRecord
      ? `No blocking gaps detected on "${continueNode?.label ?? currentNodeId}" (mastery ${Math.round(focusRecord.mastery)}, trend ${focusRecord.trend ?? 'stable'}) — keep learning.`
      : 'No blocking gaps detected — keep learning.',
    confidence: focusRecord ? Math.max(50, focusRecord.confidence ?? 50) : 50,
    evidence: focusRecord
      ? [`mastery ${Math.round(focusRecord.mastery)}`, `trend ${focusRecord.trend ?? 'stable'}`]
      : ['no mastery record yet'],
    relatedSkillIds: continueNode ? [continueNode.id] : [],
    expectedOutcome: 'Steady progress through the current material.',
  });

  // deterministic ordering: priority rank, then action, then target id
  return decisions.sort(
    (a, b) =>
      a.rank - b.rank ||
      a.action.localeCompare(b.action) ||
      a.targetNodeId.localeCompare(b.targetNodeId)
  );
}

type MasteryRecordLike = { nodeId: EntityId };

export const decisionEngine = { decideNext, decideAll };

