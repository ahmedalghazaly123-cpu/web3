// Phase 28-30: teacher, parent, institution projections over real intelligence.
import type { EntityId } from '../domain';
import { store } from '../services/store.ts';
import { assessRisk } from './risk-engine.ts';
import { computeStudentKnowledgeState } from './student-knowledge-model.ts';

export function teacherInsights(teacherId: EntityId, studentIds: EntityId[], nowIso: string): Array<{ studentId: EntityId; overall: number; risk: string; weak: string[] }> {
  void teacherId;
  return studentIds.map((sid) => {
    const st = computeStudentKnowledgeState(sid, { nowIso });
    const risk = assessRisk(sid, nowIso);
    return { studentId: sid, overall: st.overallMastery, risk: risk.category, weak: st.weak.nodeIds.slice(0, 3) };
  });
}

export function parentSnapshot(studentId: EntityId, nowIso: string): { overall: number; risk: string; streak: number; weak: string[] } {
  const st = computeStudentKnowledgeState(studentId, { nowIso });
  const risk = assessRisk(studentId, nowIso);
  const level = store.level.get(studentId);
  return { overall: st.overallMastery, risk: risk.category, streak: level?.streak ?? 0, weak: st.weak.nodeIds.slice(0, 3) };
}

export function institutionCohorts(studentIds: EntityId[], nowIso: string): { avgMastery: number; atRisk: number } {
  let sum = 0;
  let atRisk = 0;
  for (const sid of studentIds) {
    sum += computeStudentKnowledgeState(sid, { nowIso }).overallMastery;
    const c = assessRisk(sid, nowIso).category;
    if (c === 'urgent' || c === 'needs-attention') atRisk++;
  }
  return { avgMastery: studentIds.length ? Math.round(sum / studentIds.length) : 0, atRisk };
}

export const stakeholderEngine = { teacherInsights, parentSnapshot, institutionCohorts };
