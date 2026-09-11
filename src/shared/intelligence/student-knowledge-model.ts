// ━━━─ LearnPilot Learning Intelligence — Phase 5: Student Knowledge Model ━━━─
// ONE unified projection over all intelligence subsystems. Single source of
// truth for "what does the student know" — no conflicting state.
// Every answer carries an explanation (explainability contract).

import type { EntityId, GraphNode, MasteryRecord } from '../domain';
import { store } from '../services/store.ts';
import { masteryEngine } from '../services/mastery.ts';
import { knowledgeGraph } from '../services/knowledge-graph.ts';
import { nextLearnable, weakestPrerequisite } from './graph-intelligence.ts';

export interface LearningAnswer {
  explanation: string; // why — always present
  nodeIds: EntityId[];
  records: MasteryRecord[];
}

export interface StudentKnowledgeState {
  studentId: EntityId;
  computedAt: string; // ISO supplied by caller (determinism)
  overallMastery: number;
  confidence: number;
  trackedConcepts: number;
  known: LearningAnswer;
  weak: LearningAnswer;
  unstable: LearningAnswer; // low-confidence mastery estimates
  improving: LearningAnswer;
  deteriorating: LearningAnswer;
  missingPrerequisites: LearningAnswer;
  learnNext: LearningAnswer;
  reviewNow: LearningAnswer;
}

export function computeStudentKnowledgeState(
  studentId: EntityId,
  options?: { nowIso?: string }
): StudentKnowledgeState {
  const nowIso = options?.nowIso ?? new Date().toISOString();
  const records = store.mastery.listByStudent(studentId);
  const T = masteryEngine.thresholds;

  const byMastery = (a: MasteryRecord, b: MasteryRecord) =>
    a.mastery - b.mastery || a.nodeId.localeCompare(b.nodeId);

  const known = records.filter(
    (r) => r.mastered === true || (r.mastery >= T.MASTERY_AT && r.attempts >= T.MIN_ATTEMPTS_FOR_CONFIDENCE)
  );
  const weak = records.filter((r) => r.weak === true).sort(byMastery);
  const unstable = records.filter(
    (r) => !r.weak && r.mastery < T.MASTERY_AT && (r.confidence ?? 0) < 50
  );
  const improving = records.filter((r) => r.trend === 'improving');
  const deteriorating = records.filter((r) => r.trend === 'declining');
  const reviewRecords = store.reviews.listDue(studentId, nowIso);

  // missing prerequisites: for each in-progress node, its weakest unmet prereq
  const missing: Array<{ nodeId: EntityId; via: EntityId; mastery: number }> = [];
  const seen = new Set<EntityId>();
  for (const r of records.filter((x) => !x.mastered)) {
    const w = weakestPrerequisite(studentId, r.nodeId);
    if (w && !seen.has(w.nodeId)) {
      seen.add(w.nodeId);
      missing.push({ nodeId: w.nodeId, via: r.nodeId, mastery: w.mastery });
    }
  }

  const learnNodes: GraphNode[] = nextLearnable(studentId, 5);
  const overall = records.length
    ? Math.round(records.reduce((s, r) => s + r.mastery, 0) / records.length)
    : 0;
  const confidence = records.length
    ? Math.round(records.reduce((s, r) => s + (r.confidence ?? 0), 0) / records.length)
    : 0;

  return assembleState(studentId, nowIso, {
    overall, confidence, tracked: records.length,
    known, weak, unstable, improving, deteriorating, missing, learnNodes, reviewRecords,
  });
}


function assembleState(
  studentId: EntityId,
  nowIso: string,
  c: {
    overall: number; confidence: number; tracked: number;
    known: MasteryRecord[]; weak: MasteryRecord[]; unstable: MasteryRecord[];
    improving: MasteryRecord[]; deteriorating: MasteryRecord[];
    missing: Array<{ nodeId: EntityId; via: EntityId; mastery: number }>;
    learnNodes: GraphNode[];
    reviewRecords: Array<{ nodeId?: EntityId; id: EntityId }>;
  }
): StudentKnowledgeState {
  const T = masteryEngine.thresholds;
  const answer = (explanation: string, nodeIds: EntityId[], records: MasteryRecord[]): LearningAnswer => ({
    explanation, nodeIds, records,
  });
  return {
    studentId,
    computedAt: nowIso,
    overallMastery: c.overall,
    confidence: c.confidence,
    trackedConcepts: c.tracked,
    known: answer(
      `${c.known.length} concept(s) at or above the ${T.MASTERY_AT} mastery threshold with sufficient evidence.`,
      c.known.map((r) => r.nodeId), c.known
    ),
    weak: answer(
      c.weak.length
        ? `${c.weak.length} concept(s) below the ${T.WEAK_BELOW} threshold; weakest first: ${c.weak.slice(0, 3).map((r) => r.nodeId).join(', ')}.`
        : 'No concepts are currently below the weak threshold.',
      c.weak.map((r) => r.nodeId), c.weak
    ),
    unstable: answer(
      c.unstable.length
        ? `${c.unstable.length} concept(s) have little evidence — mastery estimates are uncertain (confidence < 50).`
        : 'All tracked concepts have adequate evidence for their mastery estimates.',
      c.unstable.map((r) => r.nodeId), c.unstable
    ),
    improving: answer(
      `${c.improving.length} concept(s) trending up across recent evidence.`,
      c.improving.map((r) => r.nodeId), c.improving
    ),
    deteriorating: answer(
      c.deteriorating.length
        ? `${c.deteriorating.length} concept(s) declining — recent evidence contradicts older mastery.`
        : 'No declining concepts.',
      c.deteriorating.map((r) => r.nodeId), c.deteriorating
    ),
    missingPrerequisites: answer(
      c.missing.length
        ? `Prerequisite gaps: ${c.missing.map((m) => `${m.nodeId} (needed by ${m.via}, mastery ${m.mastery})`).join('; ')}.`
        : 'No unmet prerequisites detected for in-progress concepts.',
      c.missing.map((m) => m.nodeId),
      c.missing.map((m) => store.mastery.get(studentId, m.nodeId)).filter(Boolean) as MasteryRecord[]
    ),
    learnNext: answer(
      c.learnNodes.length
        ? `Prerequisite-ready concepts, lowest mastery first: ${c.learnNodes.map((n) => n.label || n.id).join(', ')}.`
        : 'No prerequisite-ready concepts in the graph yet — complete more lessons to populate the graph.',
      c.learnNodes.map((n) => n.id), []
    ),
    reviewNow: answer(
      c.reviewRecords.length
        ? `${c.reviewRecords.length} review card(s) are due now (spaced repetition).`
        : 'No reviews are due.',
      c.reviewRecords.map((r) => r.nodeId ?? r.id), []
    ),
  };
}

/** Convenience wrapper used by UI + other engines. */
export const studentKnowledgeModel = {
  compute: computeStudentKnowledgeState,
  /** Mastery record for a node or undefined. */
  record: (studentId: EntityId, nodeId: EntityId): MasteryRecord | undefined =>
    store.mastery.get(studentId, nodeId),
  /** Node label resolution for explainability text. */
  label: (nodeId: EntityId): string => knowledgeGraph.getNode(nodeId)?.label ?? nodeId,
};
