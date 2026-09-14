// Phases 24-36 quality gates.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { store, storeBackend } from '../../services/store.ts';
import { awardMeaningfulXp, focusSummary, resetIdempotency } from '../engagement.ts';
import { createStudyRoom, logClassroomAttendance } from '../collaboration.ts';
import { teacherInsights, parentSnapshot, institutionCohorts } from '../stakeholders.ts';
import { productionEngine } from '../production.ts';

const SID = 'student-prod-1';
const T0 = '2026-06-04T10:00:00.000Z';

beforeEach(() => { storeBackend.useInMemory(); store.clearAll(); resetIdempotency(); });
afterEach(() => { storeBackend.useLocalStorage(); });

describe('phases 24-36', () => {
  it('gamification rewards meaningful behavior', async () => {
    const xp = await awardMeaningfulXp(SID, 'correct', T0);
    expect(xp.xp).toBe(10);
    expect(xp.awarded).toBe(true);
  });
  it('focus summary aggregates sessions', () => {
    store.sessions.save({ id: 's1', studentId: SID, startedAt: T0, intendedMinutes: 25, actualMinutes: 25, topic: 'Limits', completed: true });
    const f = focusSummary(SID);
    expect(f.sessions).toBe(1);
  });
  it('collaboration + classroom log events', () => {
    const room = createStudyRoom(SID, 'Study group');
    expect(room.status).toBe('waiting');
    logClassroomAttendance(SID, room.id, T0);
  });
  it('stakeholders consume real intelligence', () => {
    expect(teacherInsights('t1', [SID], T0)[0].studentId).toBe(SID);
    expect(parentSnapshot(SID, T0).overall).toBeGreaterThanOrEqual(0);
    expect(institutionCohorts([SID], T0).avgMastery).toBeGreaterThanOrEqual(0);
  });
  it('production stubs are honest', () => {
    expect(productionEngine.enqueueOffline('attempt', {}, T0)).toBe(1);
    expect(productionEngine.drainOffline()).toBe(1);
    expect(productionEngine.sandboxVerdict({ language: 'js', code: 'while(true){}', timeoutMs: 100 }).allowed).toBe(false);
    const cert = productionEngine.issueCertificate(SID, 'Calculus I', T0, 91);
    expect(productionEngine.verifyCertificate(cert.verificationCode)?.id).toBe(cert.id);
    expect(productionEngine.routeRequest(false, 0).provider).toBe('local-demo');
    expect(productionEngine.scoreAiAnswer('a b', 'a b c').relevance).toBeGreaterThan(0);
    expect(productionEngine.securityAudit().length).toBeGreaterThan(0);
  });
});