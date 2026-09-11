// Phase 8: Spaced Repetition & Forgetting (SM2-like, deterministic).
import type { EntityId, ReviewCard } from '../domain';
import { store } from '../services/store.ts';

export type ForgettingModelKind = 'sm2-like' | 'fsrs-stub' | 'custom';

export interface ReviewOutcome { quality: number; answeredAt: string; }

export interface SchedulingResult {
  card: ReviewCard;
  previousIntervalDays: number;
  previousEaseFactor: number;
  overdueDays: number;
  recovered: boolean;
  explanation: string;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function daysBetween(aIso: string, bIso: string): number {
  return (new Date(bIso).getTime() - new Date(aIso).getTime()) / 86_400_000;
}

function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 86_400_000).toISOString();
}

export function nextEaseFactor(easeFactor: number, quality: number): number {
  const q = clamp(Math.round(quality), 0, 5);
  if (q < 3) return Math.max(1.3, easeFactor - 0.2);
  const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  return clamp(Math.round((easeFactor + delta) * 100) / 100, 1.3, 2.8);
}

export function nextIntervalDays(card: ReviewCard, quality: number): number {
  const q = clamp(Math.round(quality), 0, 5);
  if (q < 3) return 1;
  if (card.repetitions <= 0) return 1;
  if (card.repetitions === 1) return 6;
  return Math.max(1, Math.round(card.intervalDays * card.easeFactor));
}

export interface ForgettingEstimate {
  cardId: EntityId;
  overdueDays: number;
  recallProbability: number;
  nextReviewAt: string;
  explanation: string;
}

export function scheduleReview(cardId: EntityId, outcome: ReviewOutcome): SchedulingResult | undefined {
  const card = store.reviews.get(cardId);
  if (!card) return undefined;
  const quality = clamp(Math.round(outcome.quality), 0, 5);
  const overdueDays = Math.max(0, Math.floor(daysBetween(card.nextReviewAt, outcome.answeredAt)));
  const previousIntervalDays = card.intervalDays;
  const previousEaseFactor = card.easeFactor;
  const easeFactor = nextEaseFactor(card.easeFactor, quality);
  const intervalDays = nextIntervalDays({ ...card, easeFactor }, quality);
  const repetitions = quality < 3 ? 0 : card.repetitions + 1;
  const recovered = overdueDays > 0 && quality >= 4;
  const finalInterval = recovered ? Math.min(60, intervalDays + Math.min(3, overdueDays)) : intervalDays;
  const updated: ReviewCard = {
    ...card, easeFactor, intervalDays: finalInterval, repetitions, quality,
    lastReviewedAt: outcome.answeredAt, nextReviewAt: addDays(outcome.answeredAt, finalInterval),
  };
  store.reviews.save(updated);
  const explanation = quality < 3
    ? `Recall quality ${quality}/5 (<3): interval reset to 1 day, ease ${previousEaseFactor.toFixed(2)}→${easeFactor.toFixed(2)}.`
    : `Recall quality ${quality}/5: interval ${previousIntervalDays}d→${finalInterval}d, ease ${previousEaseFactor.toFixed(2)}→${easeFactor.toFixed(2)}` +
      (overdueDays > 0 ? `, was ${overdueDays}d overdue${recovered ? ' — recovered' : ''}` : '') + `.`;
  return { card: updated, previousIntervalDays, previousEaseFactor, overdueDays, recovered, explanation };
}

export function ensureReviewCard(input: {
  studentId: EntityId; nodeId?: EntityId; questionId?: EntityId; mistakeId?: EntityId;
  type: ReviewCard['type']; prompt: string; answer: string; difficulty: number; nowIso: string;
}): ReviewCard {
  const key = `${input.studentId}|${input.nodeId ?? ''}|${input.questionId ?? ''}|${input.mistakeId ?? ''}|${input.prompt}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  const id = `rc-${h.toString(16)}`;
  const existing = store.reviews.get(id);
  if (existing) return existing;
  const card: ReviewCard = {
    id, studentId: input.studentId, nodeId: input.nodeId, questionId: input.questionId,
    mistakeId: input.mistakeId, type: input.type, prompt: input.prompt, answer: input.answer,
    difficulty: clamp(Math.round(input.difficulty), 1, 5), easeFactor: 2.5, intervalDays: 1,
    repetitions: 0, nextReviewAt: addDays(input.nowIso, 1),
  };
  store.reviews.save(card);
  return card;
}

export function estimateForgetting(cardId: EntityId, nowIso: string): ForgettingEstimate | undefined {
  const card = store.reviews.get(cardId);
  if (!card) return undefined;
  const overdueDays = Math.max(0, Math.floor(daysBetween(card.nextReviewAt, nowIso)));
  const base = clamp(card.easeFactor / 2.5, 0.6, 1.1);
  const span = Math.max(1, card.intervalDays);
  const recallProbability = Math.round(clamp(100 * Math.pow(base, overdueDays / span) * (overdueDays > 0 ? 0.92 : 1), 1, 100));
  return {
    cardId, overdueDays, recallProbability, nextReviewAt: card.nextReviewAt,
    explanation: overdueDays <= 0
      ? `Card is not overdue (interval ${card.intervalDays}d, ease ${card.easeFactor.toFixed(2)}); heuristic recall ${recallProbability}%.`
      : `Card is ${overdueDays}d overdue (interval ${card.intervalDays}d, ease ${card.easeFactor.toFixed(2)}); heuristic recall ${recallProbability}%.`,
  };
}

export function dueReviews(studentId: EntityId, nowIso: string): ReviewCard[] {
  const due = store.reviews.listDue(studentId, nowIso);
  return [...due].sort(
    (a, b) => daysBetween(b.nextReviewAt, nowIso) - daysBetween(a.nextReviewAt, nowIso) ||
      a.easeFactor - b.easeFactor || a.id.localeCompare(b.id),
  );
}

export const spacedRepetitionEngine = {
  scheduleReview, ensureReviewCard, estimateForgetting, dueReviews,
  nextEaseFactor, nextIntervalDays, model: 'sm2-like' as ForgettingModelKind,
};

