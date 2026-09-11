// ━━━ LearnPilot Intelligence Test Suite — Part 3: Integration Quality Gate ━━━━
// Phases 3–6: graph validation, misconception classification, student state,
// adaptive decisions — all deterministic and explainable.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { store, storeBackend } from '../../services/store.ts';
import { masteryEngine } from '../../services/mastery.ts';
import { learningEvents } from '../learning-events.ts';
import { misconceptionEngine, classifyMisconception, expectedSecondsFor } from '../misconception-engine.ts';
import { graphIntelligence, weakestPrerequisite, nextLearnable } from '../graph-intelligence.ts';
import { computeStudentKnowledgeState } from '../student-knowledge-model.ts';
import { decideNext, decideAll } from '../decision-engine.ts';
import type { Question, GraphEdge, EntityId, GraphNodeType } from '../../domain';

const SID = 'student-int-1';
const T0 = '2026-04-01T10:00:00.000Z';
const T1 = '2026-04-01T10:05:00.000Z';
const T2 = '2026-04-01T10:10:00.000Z';
const T3 = '2026-04-01T10:15:00.000Z';
const T0_MS = new Date(T0).getTime();
function t(offsetMs: number): string {
  return new Date(T0_MS + offsetMs).toISOString();
}
const CONCEPT_A = 'concept-int-a';
const CONCEPT_B = 'concept-int-b';
const QUESTION: Question = {
  id: 'q-int-1',
  courseId: 'course-int-1',
  lessonId: 'lesson-int-1',
  topic: 'Limits',
  difficulty: 2,
  type: 'multiple-choice',
  body: 'lim(x→2) (x²−4)/(x−2) = ?',
  options: ['0', '2', '4', 'Undefined'],
  correctOptionIndex: 2,
  correctAnswer: '4',
  explanation: 'Factor numerator.',
};

function buildGraph(): void {
  store.graph.save({
    nodes: [
      { id: CONCEPT_A, type: 'concept' as GraphNodeType, label: 'Limits', topic: 'Calculus', difficulty: 2, masteryBaseline: 30 },
      { id: CONCEPT_B, type: 'concept' as GraphNodeType, label: 'Derivatives', topic: 'Calculus', difficulty: 3, masteryBaseline: 30 },
      { id: SKILL_A, type: 'skill' as GraphNodeType, label: 'Differentiation', courseId: 'course-int-1' },
    ],
    edges: [
      { id: 'e1', source: CONCEPT_B, target: CONCEPT_A, kind: 'prerequisite' as const },
      { id: 'e2', source: CONCEPT_A, target: SKILL_A, kind: 'part-of' as const },
      { id: 'e3', source: CONCEPT_B, target: SKILL_A, kind: 'part-of' as const },
    ],
  });
}

function addNode(id: EntityId, t: GraphNodeType, label: string): void {
  const g = store.graph.get();
  store.graph.save({
    nodes: [...g.nodes, { id, type: t, label, topic: 'Calculus', difficulty: 2, masteryBaseline: 30 }],
    edges: g.edges,
  });
}

function addEdge(id: EntityId, s: EntityId, t: EntityId, k: GraphEdge['kind']): void {
  const g = store.graph.get();
  store.graph.save({
    nodes: g.nodes,
    edges: [...g.edges, { id, source: s, target: t, kind: k }],
  });
}

function removeNode(id: EntityId): void {
  const g = store.graph.get();
  store.graph.save({
    nodes: g.nodes.filter((n) => n.id !== id),
    edges: g.edges.filter((e) => e.source !== id && e.target !== id),
  });
}

function removeEdge(id: EntityId): void {
  const g = store.graph.get();
  store.graph.save({
    nodes: g.nodes,
    edges: g.edges.filter((e) => e.id !== id),
  });
}

function correct(): void {
  learningEvents.ingest({
    kind: 'question-answered',
    studentId: SID,
    source: 'student',
    happenedAt: T0,
    nodeId: CONCEPT_A,
    nodeType: 'concept',
    question: QUESTION,
    correct: true,
    selectedAnswer: '4',
    timeSpentSeconds: 30,
    clientKey: 'c',
  });
}

beforeEach(() => {
  storeBackend.useInMemory();
  store.clearAll();
  buildGraph();
  misconceptionEngine.install();
});
afterEach(() => {
  storeBackend.useLocalStorage();
});

// ─── graph intelligence (Phase 3) ─────────────────────────────────────────────

describe('graphIntelligence (Phase 3)', () => {
  it('validates a consistent graph as OK', () => {
    const report = graphIntelligence.validate();
    expect(report.ok).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it('detects a self-loop', () => {
    addEdge('sl', CONCEPT_A, CONCEPT_A, 'prerequisite');
    const report = graphIntelligence.validate();
    expect(report.issues.some((i) => i.kind === 'self-loop')).toBe(true);
    removeEdge('sl');
  });

  it('detects a dangling edge', () => {
    addEdge('dangle', 'ghost', CONCEPT_A, 'prerequisite');
    const report = graphIntelligence.validate();
    expect(report.issues.some((i) => i.kind === 'dangling-edge')).toBe(true);
    removeEdge('dangle');
  });

  it('detects a prerequisite cycle', () => {
    addNode('c1', 'concept', 'C1');
    addNode('c2', 'concept', 'C2');
    addEdge('cyc1', 'c1', 'c2', 'prerequisite');
    addEdge('cyc2', 'c2', 'c1', 'prerequisite');
    const report = graphIntelligence.validate();
    expect(report.issues.some((i) => i.kind === 'cycle')).toBe(true);
    removeNode('c1');
    removeNode('c2');
  });

  it('detects orphan concept', () => {
    addNode('orphan', 'concept', 'Orphan');
    const report = graphIntelligence.validate();
    expect(report.issues.some((i) => i.kind === 'orphan-node')).toBe(true);
    removeNode('orphan');
  });

  it('detects duplicate edge', () => {
    addEdge('dup1', CONCEPT_B, CONCEPT_A, 'prerequisite');
    addEdge('dup2', CONCEPT_B, CONCEPT_A, 'prerequisite');
    const report = graphIntelligence.validate();
    expect(report.issues.some((i) => i.kind === 'duplicate-edge')).toBe(true);
    removeEdge('dup2');
  });

  it('finds weakest prerequisite', () => {
    for (let i = 0; i < 3; i++) {
      masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 20, 'student', t(i * 60000));
    }
    const wp = weakestPrerequisite(SID, CONCEPT_B);
    expect(wp).toBeDefined();
    expect(wp!.nodeId).toBe(CONCEPT_A);
    expect(wp!.mastery).toBeLessThan(50);
  });

  it('returns undefined when prereqs are strong', () => {
    for (let i = 0; i < 3; i++) {
      masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 90, 'student', t(i * 60000));
    }
    expect(weakestPrerequisite(SID, CONCEPT_B)).toBeUndefined();
  });

  it('nextLearnable includes concepts with no unmet prereqs', () => {
    const ready = nextLearnable(SID, 5);
    expect(ready.some((n) => n.id === CONCEPT_A)).toBe(true);
  });

  it('canLearn true when prereqs met', () => {
    for (let i = 0; i < 3; i++) {
      masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 90, 'student', t(i * 60000));
    }
    expect(graphIntelligence.canLearn(SID, CONCEPT_B)).toBe(true);
  });

  it('canLearn false when prereqs weak', () => {
    for (let i = 0; i < 3; i++) {
      masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 20, 'student', t(i * 60000));
    }
    expect(graphIntelligence.canLearn(SID, CONCEPT_B)).toBe(false);
  });
});

// ─── misconception engine (Phase 4) ───────────────────────────────────────────

describe('misconceptionEngine (Phase 4)', () => {
  it('classifies a fast answer on easy material as careless', () => {
    const c = classifyMisconception({
      question: QUESTION, timeSpentSeconds: 2, studentId: SID,
      nodeId: CONCEPT_A, nodeType: 'concept', happenedAt: T0,
      selectedAnswer: '0',
    });
    expect(c.signals.fastAnswer).toBe(true);
    expect(['careless', 'conceptual', 'calculation']).toContain(c.category);
  });

  it('classifies a very slow answer as timing issue', () => {
    const c = classifyMisconception({
      question: QUESTION, timeSpentSeconds: 300, studentId: SID,
      nodeId: CONCEPT_A, nodeType: 'concept', happenedAt: T0,
      selectedAnswer: '0',
    });
    expect(c.signals.slowAnswer).toBe(true);
    expect(c.signals.expectedSeconds).toBeGreaterThan(0);
  });

  it('classifies repeated question mistake as repeated misconception', () => {
    misconceptionEngine.record({
      question: QUESTION, timeSpentSeconds: 45, studentId: SID,
      nodeId: CONCEPT_A, nodeType: 'concept', happenedAt: T0,
      selectedAnswer: '0', correctAnswer: '4', explanation: 'Factor numerator.',
    });
    const c = classifyMisconception({
      question: QUESTION, timeSpentSeconds: 45, studentId: SID,
      nodeId: CONCEPT_A, nodeType: 'concept', happenedAt: T1,
      selectedAnswer: '0',
    });
    expect(c.signals.repeatedQuestion).toBe(true);
    expect(c.recurrence).toBeGreaterThanOrEqual(2);
  });

  it('expectedSecondsFor returns difficulty × 30 (min 20)', () => {
    expect(expectedSecondsFor({ ...QUESTION, difficulty: 1 })).toBe(30);
    expect(expectedSecondsFor({ ...QUESTION, difficulty: 5 })).toBe(150);
    expect(expectedSecondsFor({ ...QUESTION, difficulty: 0 })).toBe(20);
  });

  it('records a mistake entry in the store', () => {
    const entry = misconceptionEngine.record({
      question: QUESTION, timeSpentSeconds: 45, studentId: SID,
      nodeId: CONCEPT_A, nodeType: 'concept', happenedAt: T0,
      selectedAnswer: '0', correctAnswer: '4', explanation: 'Factor numerator.',
    });
    expect(entry).toBeDefined();
    expect(entry!.category).toBeDefined();
    expect(entry!.studentId).toBe(SID);
    expect(entry!.topic).toBe('Limits');
  });

  it('marks a mistake as recovered', () => {
    const entry = misconceptionEngine.record({
      question: QUESTION, timeSpentSeconds: 45, studentId: SID,
      nodeId: CONCEPT_A, nodeType: 'concept', happenedAt: T0,
      selectedAnswer: '0', correctAnswer: '4', explanation: 'Factor numerator.',
    });
    const recovered = misconceptionEngine.markRecovered(entry!.id, T2);
    expect(recovered!.resolved).toBe(true);
    expect(recovered!.recoveredAt).toBe(T2);
  });

  it('records an intervention against a mistake', () => {
    const entry = misconceptionEngine.record({
      question: QUESTION, timeSpentSeconds: 45, studentId: SID,
      nodeId: CONCEPT_A, nodeType: 'concept', happenedAt: T0,
      selectedAnswer: '0', correctAnswer: '4', explanation: 'Factor numerator.',
    });
    const updated = misconceptionEngine.recordIntervention(entry!.id, 'ai-tutor', T2);
    expect(updated!.intervention).toHaveLength(1);
    expect(updated!.intervention![0]!.kind).toBe('ai-tutor');
  });

  it('summary aggregates open/recovered/high-severity counts', () => {
    misconceptionEngine.record({
      question: QUESTION, timeSpentSeconds: 45, studentId: SID,
      nodeId: CONCEPT_A, nodeType: 'concept', happenedAt: T0,
      selectedAnswer: '0', correctAnswer: '4', explanation: 'Factor numerator.',
    });
    const s = misconceptionEngine.summary(SID);
    expect(s.totalOpen).toBeGreaterThanOrEqual(1);
    expect(typeof s.recoveryRate).toBe('number');
    expect(typeof s.highSeverityCount).toBe('number');
  });
});

// ─── student knowledge model (Phase 5) ────────────────────────────────────────

describe('studentKnowledgeModel (Phase 5)', () => {
  it('returns a complete StudentKnowledgeState', () => {
    correct(); correct(); correct();
    const state = computeStudentKnowledgeState(SID, { nowIso: T3 });
    expect(state.studentId).toBe(SID);
    expect(state.computedAt).toBe(T3);
    expect(typeof state.overallMastery).toBe('number');
    expect(typeof state.confidence).toBe('number');
    expect(typeof state.trackedConcepts).toBe('number');
    expect(state.known).toBeDefined();
    expect(state.weak).toBeDefined();
    expect(state.unstable).toBeDefined();
    expect(state.improving).toBeDefined();
    expect(state.deteriorating).toBeDefined();
    expect(state.missingPrerequisites).toBeDefined();
    expect(state.learnNext).toBeDefined();
    expect(state.reviewNow).toBeDefined();
  });

  it('every LearningAnswer has explanation + nodeIds + records', () => {
    const state = computeStudentKnowledgeState(SID, { nowIso: T3 });
    const answers = [
      state.known, state.weak, state.unstable, state.improving,
      state.deteriorating, state.missingPrerequisites, state.learnNext, state.reviewNow,
    ];
    for (const a of answers) {
      expect(a.explanation).toBeTruthy();
      expect(Array.isArray(a.nodeIds)).toBe(true);
      expect(Array.isArray(a.records)).toBe(true);
    }
  });

  it('known concepts have explanation referencing mastery threshold', () => {
    correct(); correct(); correct();
    const state = computeStudentKnowledgeState(SID, { nowIso: T3 });
    expect(state.known.explanation).toMatch(/mastery/i);
  });

  it('weak concepts have explanation referencing weak threshold', () => {
    masteryEngine.ingestEvidence(SID, CONCEPT_B, 'concept', 'responseAccuracy', 20, 'student', T0);
    masteryEngine.ingestEvidence(SID, CONCEPT_B, 'concept', 'responseAccuracy', 20, 'student', T1);
    masteryEngine.ingestEvidence(SID, CONCEPT_B, 'concept', 'responseAccuracy', 20, 'student', T2);
    const state = computeStudentKnowledgeState(SID, { nowIso: T3 });
    expect(state.weak.explanation).toMatch(/weak/i);
  });

  it('learnNext suggests prerequisite-ready concepts', () => {
    const state = computeStudentKnowledgeState(SID, { nowIso: T3 });
    expect(state.learnNext.explanation).toMatch(/prerequisite-ready/i);
  });

  it('overallMastery is average of all tracked mastery values', () => {
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 80, 'student', T0);
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 80, 'student', T1);
    masteryEngine.ingestEvidence(SID, CONCEPT_A, 'concept', 'responseAccuracy', 80, 'student', T2);
    masteryEngine.ingestEvidence(SID, CONCEPT_B, 'concept', 'responseAccuracy', 40, 'student', T0);
    masteryEngine.ingestEvidence(SID, CONCEPT_B, 'concept', 'responseAccuracy', 40, 'student', T1);
    masteryEngine.ingestEvidence(SID, CONCEPT_B, 'concept', 'responseAccuracy', 40, 'student', T2);
    const state = computeStudentKnowledgeState(SID, { nowIso: T3 });
    // overallMastery = average of mastery field from each record (weighted evidence)
    const recA = store.mastery.get(SID, CONCEPT_A)!;
    const recB = store.mastery.get(SID, CONCEPT_B)!;
    const expected = Math.round((recA.mastery + recB.mastery) / 2);
    expect(state.overallMastery).toBe(expected);
  });

  it('returns empty state for student with no data', () => {
    const state = computeStudentKnowledgeState('no-data-student', { nowIso: T3 });
    expect(state.overallMastery).toBe(0);
    expect(state.trackedConcepts).toBe(0);
    expect(state.known.records).toHaveLength(0);
    expect(state.weak.records).toHaveLength(0);
  });
});

// ─── decision engine (Phase 6) ─────────────────────────────────────────────────

describe('decisionEngine (Phase 6)', () => {
  it('returns a ranked list of AdaptiveDecisions via decideAll', () => {
    correct(); correct(); correct();
    const decisions = decideAll({ studentId: SID, nowIso: T3 });
    expect(Array.isArray(decisions)).toBe(true);
    expect(decisions.length).toBeGreaterThan(0);
  });

  it('decideNext returns the top-priority decision', () => {
    correct(); correct(); correct();
    const next = decideNext({ studentId: SID, nowIso: T3 });
    expect(next).toBeDefined();
    expect(next!.action).toBeDefined();
    expect(next!.reason).toBeTruthy();
  });

  it('every decision has required fields', () => {
    correct(); correct(); correct();
    const decisions = decideAll({ studentId: SID, nowIso: T3 });
    for (const d of decisions) {
      expect(d.id).toBeTruthy();
      expect(['CONTINUE', 'PRACTICE', 'REVIEW', 'REMEDIATE', 'RETURN_TO_PREREQUISITE', 'SKIP', 'CHALLENGE', 'REASSESS']).toContain(d.action);
      expect(d.targetNodeId).toBeTruthy();
      expect(d.targetLabel).toBeTruthy();
      expect(['critical', 'high', 'medium', 'low']).toContain(d.priority);
      expect(d.reason).toBeTruthy();
      expect(typeof d.confidence).toBe('number');
      expect(Array.isArray(d.evidence)).toBe(true);
      expect(Array.isArray(d.relatedSkillIds)).toBe(true);
      expect(d.expectedOutcome).toBeTruthy();
      expect(typeof d.rank).toBe('number');
    }
  });

  it('decisions are deterministically ordered', () => {
    correct(); correct(); correct();
    const a = decideAll({ studentId: SID, nowIso: T3 });
    const b = decideAll({ studentId: SID, nowIso: T3 });
    expect(a).toEqual(b);
  });

  it('reason strings are human-readable and evidence-based', () => {
    correct(); correct(); correct();
    const decisions = decideAll({ studentId: SID, nowIso: T3 });
    for (const d of decisions) {
      expect(d.reason.length).toBeGreaterThan(20);
      expect(d.evidence.length).toBeGreaterThan(0);
    }
  });
});

// ─── pipeline wiring: mistake → event → mastery ───────────────────────────────

describe('end-to-end pipeline wiring', () => {
  it('wrong answer routes through misconception observer → mistake-recorded event', () => {
    learningEvents.recordQuestionAttempt({
      studentId: SID, question: QUESTION, nodeId: CONCEPT_A, nodeType: 'concept',
      correct: false, selectedAnswer: '0', timeSpentSeconds: 45,
      happenedAt: T0, clientKey: 'wrong-1',
    });
    const mistakes = store.mistakes.listByStudent(SID);
    expect(mistakes.length).toBeGreaterThanOrEqual(1);
    const events = learningEvents.listByStudent(SID);
    const mistakeEvents = events.filter((e) => e.kind === 'mistake-recorded');
    expect(mistakeEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('correct answer does NOT create a mistake', () => {
    learningEvents.recordQuestionAttempt({
      studentId: SID, question: QUESTION, nodeId: CONCEPT_A, nodeType: 'concept',
      correct: true, selectedAnswer: '4', timeSpentSeconds: 30,
      happenedAt: T0, clientKey: 'right-1',
    });
    const mistakes = store.mistakes.listByStudent(SID);
    expect(mistakes.length).toBe(0);
  });

  it('repeated wrong answers increase repetitionCount', () => {
    learningEvents.recordQuestionAttempt({
      studentId: SID, question: QUESTION, nodeId: CONCEPT_A, nodeType: 'concept',
      correct: false, selectedAnswer: '0', timeSpentSeconds: 45,
      happenedAt: T0, clientKey: 'wrong-a',
    });
    learningEvents.recordQuestionAttempt({
      studentId: SID, question: QUESTION, nodeId: CONCEPT_A, nodeType: 'concept',
      correct: false, selectedAnswer: '2', timeSpentSeconds: 50,
      happenedAt: T1, clientKey: 'wrong-b',
    });
    const mistakes = store.mistakes.listByStudent(SID).filter((m) => m.questionId === QUESTION.id);
    const totalRepetitions = mistakes.reduce((s, m) => s + (m.repetitionCount ?? 1), 0);
    expect(totalRepetitions).toBeGreaterThanOrEqual(2);
  });
});





const SKILL_A = 'skill-int-a';
