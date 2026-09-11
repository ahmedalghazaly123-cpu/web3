// ━━━─ LearnPilot Learning Intelligence — Phase 4: Misconception Intelligence ━━━─
// Structured mistake classification with deterministic, explainable rules.
//
// Pipeline integration:
//   wrong answer → learningEvents.recordQuestionAttempt → observer (this engine)
//   → classify (pure) → persist MistakeEntry (+ recurrence/severity/recovery)
//   → emit 'mistake-recorded' learning event → mastery evidence (repeated
//     mistakes produce STRONGER learning signals via repetitionCount).
//
// Deterministic: classification depends only on structured evidence (time,
// difficulty, history, prerequisite state) — never on the wall clock.

import type {
  EntityId,
  GraphNodeType,
  MistakeCategory,
  MistakeEntry,
  Question,
} from '../domain';
import { store } from '../services/store.ts';
import { masteryEngine } from '../services/mastery.ts';
import { knowledgeGraph, _linkWeakness } from '../services/knowledge-graph.ts';
import { learningEvents, registerMisconceptionObserver } from './learning-events.ts';

// ─── classification (pure) ────────────────────────────────────────────────────

export interface MisconceptionClassificationInput {
  question: Question;
  timeSpentSeconds: number;
  studentId: EntityId;
  nodeId: EntityId;
  nodeType: GraphNodeType;
  happenedAt: string;
  selectedAnswer: string;
}

export interface MisconceptionClassification {
  category: MistakeCategory;
  severity: 'low' | 'medium' | 'high';
  signals: {
    fastAnswer: boolean;
    slowAnswer: boolean;
    repeatedQuestion: boolean;
    repeatedTopic: boolean;
    previouslyMastered: boolean;
    prerequisiteWeak: boolean;
    expectedSeconds: number;
  };
  /** Deterministic rule trace — every classification must be explainable. */
  why: string;
  /** Repetition count observed at classification time (1 = first occurrence). */
  recurrence: number;
}

/** Expected time budget for a question: difficulty × 30s (same rule as practice scoring). */
export function expectedSecondsFor(question: Question): number {
  return Math.max(20, question.difficulty * 30);
}

/**
 * Deterministic classifier. Rules are ordered by evidence strength:
 *  1. repeated misconception — same question seen wrong before (strongest signal)
 *  2. prerequisite gap — an unmet prerequisite explains the failure
 *  3. retrieval failure — previously-mastered concept not recalled
 *  4. careless — very fast answer on easy material
 *  5. timing — far too slow (pace, not knowledge)
 *  6. conceptual vs calculation — split by difficulty
 */
export function classifyMisconception(
  input: MisconceptionClassificationInput
): MisconceptionClassification {
  const { question, timeSpentSeconds, studentId, nodeId, nodeType } = input;

  const priorMistakes = store.mistakes.listByStudent(studentId);
  const sameQuestion = priorMistakes.filter((m) => m.questionId === question.id && !m.resolved);
  const sameTopic = priorMistakes.filter((m) => m.topic === question.topic && !m.resolved);
  const priorRecord = store.mastery.get(studentId, nodeId);

  const expectedSeconds = expectedSecondsFor(question);
  const fastAnswer = timeSpentSeconds < 5 && question.difficulty <= 2;
  const slowAnswer = timeSpentSeconds > expectedSeconds * 2;
  const repeatedQuestion = sameQuestion.length > 0;
  const repeatedTopic = sameTopic.length >= 2 && !repeatedQuestion;
  const previouslyMastered = (priorRecord?.mastery ?? 0) >= masteryEngine.thresholds.MASTERY_AT;
  const prereqIds = knowledgeGraph.getPrerequisites(nodeId).concat(
    nodeType === 'lesson' ? knowledgeGraph.getContextForLesson(nodeId).prerequisites.map((p) => p.id) : []
  );
  const prerequisiteWeak = prereqIds.some((p) => {
    const m = store.mastery.get(studentId, p);
    return m !== undefined && (m.mastery < masteryEngine.thresholds.WEAK_BELOW || m.weak);
  });

  // ── ordered rules ──
  let category: MistakeCategory;
  let why: string;

  if (repeatedQuestion) {
    category = 'repeated';
    why = `Question ${question.id} was missed ${sameQuestion.length}× before — recurring misconception on "${question.topic}".`;
  } else if (prerequisiteWeak) {
    category = 'prerequisite';
    why = `An unmet prerequisite of this concept is weak (mastery < ${masteryEngine.thresholds.WEAK_BELOW}) — the gap upstream explains this failure.`;
  } else if (previouslyMastered) {
    category = 'retrieval-failure';
    why = `Mastery was ≥ ${masteryEngine.thresholds.MASTERY_AT} but the answer failed — previously-learned knowledge not recalled (review needed).`;
  } else if (fastAnswer) {
    category = 'careless';
    why = `Answered in ${timeSpentSeconds}s (< 5s) on difficulty ${question.difficulty} — rushed, not a knowledge gap.`;
  } else if (slowAnswer) {
    category = 'timing';
    why = `Took ${timeSpentSeconds}s vs expected ${expectedSeconds}s — problem-solving pace issue rather than conceptual gap.`;
  } else if (question.difficulty >= 4) {
    category = 'conceptual';
    why = `High difficulty (${question.difficulty}/5) with normal pace — likely a wrong mental model of the concept.`;
  } else {
    category = 'calculation';
    why = `Routine difficulty (${question.difficulty}/5) — process/slip error rather than a concept gap.`;
  }

  const recurrence = repeatedQuestion ? sameQuestion[0].repetitionCount + 1 : 1;

  // severity grows with recurrence and prerequisite involvement
  const severity: MisconceptionClassification['severity'] =
    recurrence >= 3 || (prerequisiteWeak && recurrence >= 2)
      ? 'high'
      : recurrence === 2 || prerequisiteWeak
        ? 'medium'
        : 'low';

  return {
    category,
    severity,
    signals: {
      fastAnswer,
      slowAnswer,
      repeatedQuestion,
      repeatedTopic,
      previouslyMastered,
      prerequisiteWeak,
      expectedSeconds,
    },
    why,
    recurrence,
  };
}


// ─── persistence + pipeline integration ───────────────────────────────────────

export interface RecordMisconceptionInput extends MisconceptionClassificationInput {
  correctAnswer: string;
  explanation?: string;
}

type InterventionKind = NonNullable<MistakeEntry['intervention']>[number]['kind'];

export const misconceptionEngine = {
  /**
   * Record a mistake from the learning events pipeline:
   *  - classifies deterministically
   *  - merges into an existing open mistake (recurrence++) or creates one
   *  - emits a 'mistake-recorded' learning event (repetitionCount → mastery
   *    evidence: repeated mistakes produce STRONGER learning signals)
   *  - links weakness to the knowledge graph
   */
  record(input: RecordMisconceptionInput): MistakeEntry {
    const c = classifyMisconception(input);
    const priorMistakes = store.mistakes.listByStudent(input.studentId);
    const existing = priorMistakes.find(
      (m) => m.questionId === input.question.id && !m.resolved
    );

    const base: MistakeEntry = existing ?? {
      id: store.uid(),
      studentId: input.studentId,
      questionId: input.question.id,
      topic: input.question.topic,
      category: c.category,
      question: input.question.body,
      studentAnswer: input.selectedAnswer,
      correctAnswer: input.correctAnswer,
      explanation: input.explanation ?? input.question.explanation,
      difficulty: input.question.difficulty,
      firstSeenAt: input.happenedAt,
      lastSeenAt: input.happenedAt,
      repetitionCount: 0,
      relatedConceptIds: [input.nodeId],
      resolved: false,
    };

    const entry: MistakeEntry = {
      ...base,
      category: c.category,
      studentAnswer: input.selectedAnswer,
      severity: c.severity,
      signals: {
        ...c.signals,
        timeSpentSeconds: input.timeSpentSeconds,
        difficulty: input.question.difficulty,
      } as MistakeEntry['signals'],
      explanationWhy: c.why,
      lastSeenAt: input.happenedAt,
      repetitionCount: c.recurrence,
      relatedConceptIds: [...new Set([...(base.relatedConceptIds ?? []), input.nodeId])],
      resolved: false,
      recoveredAt: undefined,
    };

    store.mistakes.save(entry);

    // graph link: mistake → weakness-linked → concept
    _linkWeakness(entry.id, input.nodeId);

    // learning event → mastery evidence (repeated ⇒ stronger signal)
    learningEvents.ingest({
      kind: 'mistake-recorded',
      studentId: input.studentId,
      source: 'assessment',
      happenedAt: input.happenedAt,
      nodeId: input.nodeId,
      nodeType: input.nodeType,
      questionId: input.question.id,
      payload: {
        repetitionCount: c.recurrence,
        category: c.category,
        severity: c.severity,
        mistakeId: entry.id,
      },
      clientKey: `mistake-${entry.id}-${c.recurrence}`,
    });

    return entry;
  },
  /**
   * Recovery: the same question was answered correctly afterwards.
   * Tracks intervention effectiveness when interventions were applied.
   */
  markRecovered(mistakeId: EntityId, happenedAt: string): MistakeEntry | undefined {
    const m = store.mistakes.get(mistakeId);
    if (!m) return undefined;
    const updated: MistakeEntry = {
      ...m,
      resolved: true,
      recoveredAt: happenedAt,
    };
    store.mistakes.save(updated);
    return updated;
  },

  /**
   * Check if a student has a recovered mistake for a given question.
   * Returns true if there exists a resolved mistake entry for this question.
   */
  wasRecovered(studentId: EntityId, questionId?: EntityId): boolean {
    if (!questionId) return false;
    return store.mistakes
      .listByStudent(studentId)
      .some((m) => m.questionId === questionId && m.resolved === true);
  },

  /** Record an intervention (ai-tutor session / review / lesson) against a mistake. */
  recordIntervention(
    mistakeId: EntityId,
    kind: InterventionKind,
    happenedAt: string
  ): MistakeEntry | undefined {
    const m = store.mistakes.get(mistakeId);
    if (!m) return undefined;
    const updated: MistakeEntry = {
      ...m,
      intervention: [...(m.intervention ?? []), { kind, at: happenedAt }],
    };
    store.mistakes.save(updated);
    return updated;
  },


  /** Aggregated misconception summary for a student (deterministic). */
  summary(studentId: EntityId) {
    const all = store.mistakes.listByStudent(studentId);
    const open = all.filter((m) => !m.resolved);
    const recovered = all.filter((m) => m.resolved && m.recoveredAt);
    const byCategory = new Map<MistakeCategory, number>();
    for (const m of open) byCategory.set(m.category, (byCategory.get(m.category) ?? 0) + 1);
    const topRecurring = [...open]
      .sort((a, b) => b.repetitionCount - a.repetitionCount)
      .slice(0, 5);
    const highSeverity = open.filter((m) => m.severity === 'high');
    const interventionRecovered = recovered.filter((m) => (m.intervention?.length ?? 0) > 0);
    return {
      totalOpen: open.length,
      totalRecovered: recovered.length,
      highSeverityCount: highSeverity.length,
      byCategory: Object.fromEntries(byCategory) as Record<string, number>,
      topRecurring,
      recoveryRate: recovered.length + open.length > 0
        ? Math.round((recovered.length / (recovered.length + open.length)) * 100)
        : 0,
      interventionEffectiveness:
        recovered.length > 0
          ? Math.round((interventionRecovered.length / recovered.length) * 100)
          : 0,
    };
  },

  /** Wire the observer into the learning events pipeline (idempotent). */
  install(): void {
    registerMisconceptionObserver((input) => {
      this.record({
        ...input,
        correctAnswer: input.question.correctAnswer,
        explanation: input.question.explanation,
      });
    });
  },
};

// Auto-install at module load: any import of this engine wires the pipeline.
misconceptionEngine.install();
