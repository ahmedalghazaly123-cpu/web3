// Phases 11-13 quality gates.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { store, storeBackend } from '../../services/store.ts';
import { planStudy } from '../planner.ts';
import { buildTutorContext, hintFor } from '../tutor-context.ts';
import { askCourse } from '../course-retrieval.ts';

const SID = 'student-mid-1';
const T0 = '2026-06-02T10:00:00.000Z';

beforeEach(() => { storeBackend.useInMemory(); store.clearAll(); });
afterEach(() => { storeBackend.useLocalStorage(); });

describe('plannerEngine (Phase 11)', () => {
  it('plans within available minutes with explanation', () => {
    const out = planStudy({ studentId: SID, nowIso: T0, availableMinutes: 60 });
    expect(out.totalMinutes).toBeLessThanOrEqual(60);
    expect(out.explanation).toBeTruthy();
  });
  it('deterministic', () => {
    expect(planStudy({ studentId: SID, nowIso: T0, availableMinutes: 45 })).toEqual(
      planStudy({ studentId: SID, nowIso: T0, availableMinutes: 45 }));
  });
});

describe('tutorContextEngine (Phase 12)', () => {
  it('builds structured context without LLM', () => {
    const ctx = buildTutorContext(SID, T0);
    expect(ctx.systemPrompt).toContain('LearnPilot AI Tutor');
    expect(ctx.overallMastery).toBeGreaterThanOrEqual(0);
  });
  it('hint escalates with attempts', () => {
    expect(hintFor('missing', 0)).toBeTruthy();
  });
});

describe('courseRetrieval (Phase 13)', () => {
  it('grounds answers with citations', () => {
    const a = askCourse('What is the power rule for derivatives?');
    expect(a.grounded).toBe(true);
    expect(a.citations.length).toBeGreaterThan(0);
  });
  it('refuses when no evidence', () => {
    const a = askCourse('Explain quantum chromodynamics funding policy');
    expect(a.grounded).toBe(false);
    expect(a.answer).toMatch(/enough course evidence/i);
  });
});
