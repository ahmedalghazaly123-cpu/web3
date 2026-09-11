// Phase 11: Planner Intelligence (deterministic, value-prioritized).
import type { EntityId, PlanItem } from '../domain';
import { store } from '../services/store.ts';
import { buildLearningPath, pathToPlanItems } from './learning-path.ts';
import { dueReviews } from './spaced-repetition.ts';

export interface PlannerInput {
  studentId: EntityId; nowIso: string;
  availableMinutes: number; deadlineIso?: string;
}

export interface PlannerOutput {
  items: PlanItem[]; totalMinutes: number;
  explanation: string;
}

export function planStudy(input: PlannerInput): PlannerOutput {
  const path = buildLearningPath(input.studentId, input.nowIso, 10);
  let items = pathToPlanItems(path);
  // Cap by available time (greedy, priority order = path order).
  const picked: PlanItem[] = [];
  let used = 0;
  for (const it of items) {
    if (used + it.estimatedMinutes <= input.availableMinutes || picked.length === 0) {
      picked.push(it); used += it.estimatedMinutes;
    }
    if (used >= input.availableMinutes) break;
  }
  items = picked;
  // Persist planned items for streak/risk signals (ids stable per path+now).
  for (const it of items) store.plans.save({ ...it, scheduledFor: input.nowIso });
  const due = dueReviews(input.studentId, input.nowIso).length;
  return {
    items, totalMinutes: used,
    explanation: `Planned ${items.length} item(s) (${used} min) from learning value: ` +
      `${due} due review(s) first, then weakest prerequisites.`,
  };
}

export const plannerEngine = { planStudy };
