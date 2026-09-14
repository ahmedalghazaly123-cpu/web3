// Phase 10: Risk & Struggle Intelligence (deterministic, non-diagnostic).
import type { EntityId } from '../domain';
import { store } from '../services/store.ts';

export type RiskCategory = 'healthy' | 'watch' | 'needs-attention' | 'urgent';
export type RiskSignalKind = 'declining-mastery' | 'repeated-mistakes' | 'inactivity' | 'overdue-reviews' | 'low-confidence' | 'poor-quiz' | 'failed-prerequisites' | 'low-velocity';

export interface RiskSignalDetail { signal: RiskSignalKind; detail: string; weight: number; }

export interface RiskAssessment {
  studentId: EntityId; computedAt: string;
  score: number; category: RiskCategory;
  signals: RiskSignalDetail[]; confidence: number;
  intervention: string;
}

const KIND_WEIGHT: Record<RiskSignalKind, number> = {
  'declining-mastery': 22, 'repeated-mistakes': 18, inactivity: 16,
  'overdue-reviews': 14, 'low-confidence': 8, 'poor-quiz': 14,
  'failed-prerequisites': 12, 'low-velocity': 8,
};

export function assessRisk(studentId: EntityId, nowIso: string): RiskAssessment {
  const signals: RiskSignalDetail[] = [];
  const now = new Date(nowIso).getTime();
  const records = store.mastery.listByStudent(studentId);

  const declining = records.filter((r) => r.trend === 'declining');
  if (declining.length > 0) signals.push({ signal: 'declining-mastery', detail: `${declining.length} concept(s) declining: ${declining.slice(0, 3).map((r) => r.nodeId).join(', ')}.`, weight: KIND_WEIGHT['declining-mastery'] });

  const openMistakes = store.mistakes.listByStudent(studentId).filter((m) => !m.resolved);
  const repeated = openMistakes.filter((m) => (m.repetitionCount ?? 1) >= 2);
  if (repeated.length > 0) signals.push({ signal: 'repeated-mistakes', detail: `${repeated.length} repeated misconception(s) need remediation.`, weight: KIND_WEIGHT['repeated-mistakes'] });
  else if (openMistakes.length >= 4) signals.push({ signal: 'repeated-mistakes', detail: `${openMistakes.length} open mistakes suggest struggle.`, weight: 10 });

  const lastActivity = records.reduce((m, r) => Math.max(m, new Date(r.lastPracticedAt).getTime() || 0), 0);
  const idleDays = lastActivity ? (now - lastActivity) / 86_400_000 : 99;
  // A student with no mastery records has never been active — inactivity does
  // not apply. Only flag inactivity for students who have established activity.
  if (records.length > 0 && idleDays > 7) signals.push({ signal: 'inactivity', detail: `No learning activity for ${Math.floor(idleDays)} days.`, weight: KIND_WEIGHT.inactivity });
  else if (idleDays > 3 && records.length > 0) signals.push({ signal: 'inactivity', detail: `Activity gap of ${Math.floor(idleDays)} days.`, weight: 8 });

  const overdue = store.reviews.listDue(studentId, nowIso);
  if (overdue.length >= 3) signals.push({ signal: 'overdue-reviews', detail: `${overdue.length} reviews overdue — recall is decaying.`, weight: KIND_WEIGHT['overdue-reviews'] });

  const thin = records.filter((r) => !r.weak && (r.confidence ?? 100) < 40 && r.attempts >= 2);
  if (thin.length > 0) signals.push({ signal: 'low-confidence', detail: `${thin.length} mastery estimate(s) rest on thin evidence.`, weight: KIND_WEIGHT['low-confidence'] });

  const DAY = 86_400_000;
  const recentAttempts = store.attempts.listByStudent(studentId).filter((a) => now - new Date(a.answeredAt).getTime() < 14 * DAY);
  if (recentAttempts.length >= 3) {
    const acc = recentAttempts.filter((a) => a.correct).length / recentAttempts.length;
    if (acc < 0.45) signals.push({ signal: 'poor-quiz', detail: `Recent accuracy ${(acc * 100).toFixed(0)}% across ${recentAttempts.length} attempts (14d).`, weight: KIND_WEIGHT['poor-quiz'] });
  }

  const score = Math.min(100, signals.reduce((s, x) => s + x.weight, 0));
  const category: RiskCategory = score >= 65 ? 'urgent' : score >= 40 ? 'needs-attention' : score >= 18 ? 'watch' : 'healthy';
  const confidence = Math.min(95, 55 + signals.length * 10 + Math.min(15, records.length * 2));
  const top = [...signals].sort((a, b) => b.weight - a.weight)[0];
  const intervention = !top ? 'No intervention needed — keep learning.'
    : top.signal === 'declining-mastery' ? `Remediate ${top.detail} Review prerequisite chain before new material.`
    : top.signal === 'repeated-mistakes' ? `Scheduled misconception review: revisit the mistake notebook with guided hints.`
    : top.signal === 'inactivity' ? `Re-engage with a short 10-minute review session to rebuild momentum.`
    : top.signal === 'overdue-reviews' ? `Clear the ${overdue.length} overdue review(s) with spaced retrieval practice.`
    : `Targeted practice on the weakest concept with reassessment.`;
  return { studentId, computedAt: nowIso, score, category, signals, confidence, intervention };
}

export const riskEngine = { assessRisk };
