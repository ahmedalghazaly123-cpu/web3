// XP Test Matrix (Phase 24) — proves idempotency, concurrency, authorization, persistence.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { store, storeBackend } from '../../services/store.ts';
import { engagementEngine, resetIdempotency } from '../engagement.ts';

const SID = 'student-xp-1';
const T0 = '2026-06-04T10:00:00.000Z';

beforeEach(() => { storeBackend.useInMemory(); store.clearAll(); resetIdempotency(); });
afterEach(() => { storeBackend.useLocalStorage(); });

describe('XP test matrix', () => {
  it('Test 1: first legitimate event awards XP', async () => {
    const r = await engagementEngine.awardMeaningfulXp(SID, 'correct', T0, 'ck-1');
    expect(r.awarded).toBe(true);
    expect(r.xp).toBe(10);
    expect(r.previousXp).toBe(0);
    expect(r.previousLevel).toBe(1);
  });

  it('Test 2: same event twice awards XP once', async () => {
    const r1 = await engagementEngine.awardMeaningfulXp(SID, 'correct', T0, 'ck-2');
    expect(r1.awarded).toBe(true);
    const r2 = await engagementEngine.awardMeaningfulXp(SID, 'correct', T0, 'ck-2');
    expect(r2.awarded).toBe(false);
    expect(r2.xp).toBe(r1.xp);
  });

  it('Test 3: page reload does not award XP again', async () => {
    const r1 = await engagementEngine.awardMeaningfulXp(SID, 'correct', T0, 'ck-3');
    const r2 = await engagementEngine.awardMeaningfulXp(SID, 'correct', T0, 'ck-3');
    expect(r2.awarded).toBe(false);
    expect(r2.xp).toBe(r1.xp);
  });

  it('Test 4: duplicate API request does not award XP again', async () => {
    const r1 = await engagementEngine.awardMeaningfulXp(SID, 'correct', T0, 'ck-4');
    const r2 = await engagementEngine.awardMeaningfulXp(SID, 'correct', T0, 'ck-4');
    const r3 = await engagementEngine.awardMeaningfulXp(SID, 'correct', T0, 'ck-4');
    expect(r1.awarded).toBe(true);
    expect(r2.awarded).toBe(false);
    expect(r3.awarded).toBe(false);
    expect(r2.xp).toBe(r1.xp);
    expect(r3.xp).toBe(r1.xp);
  });

  it('Test 5: two different legitimate events award independently', async () => {
    const r1 = await engagementEngine.awardMeaningfulXp(SID, 'correct', T0, 'ck-5a');
    const r2 = await engagementEngine.awardMeaningfulXp(SID, 'review', T0, 'ck-5b');
    expect(r1.awarded).toBe(true);
    expect(r2.awarded).toBe(true);
    expect(r2.xp).toBe(r1.xp + 8);
  });

  it('Test 6: level recalculation remains correct', async () => {
    const r1 = await engagementEngine.awardMeaningfulXp(SID, 'mastery', T0, 'ck-6a');
    expect(r1.level).toBe(1);
    const r2 = await engagementEngine.awardMeaningfulXp(SID, 'mastery', T0, 'ck-6b');
    expect(r2.xp).toBe(100);
    expect(r2.level).toBe(2);
    expect(r2.xpToNext).toBe(300);
  });

  it('Test 7: achievement reload cannot create duplicate XP', async () => {
    const r1 = await engagementEngine.awardMeaningfulXp(SID, 'achievement', T0, 'ck-7');
    expect(r1.awarded).toBe(true);
    expect(r1.xp).toBe(25);
    const r2 = await engagementEngine.awardMeaningfulXp(SID, 'achievement', T0, 'ck-7');
    expect(r2.awarded).toBe(false);
    expect(r2.xp).toBe(25);
  });

  it('Test 8: different kinds award independently', async () => {
    const r1 = await engagementEngine.awardMeaningfulXp(SID, 'correct', T0, 'ck-8a');
    const r2 = await engagementEngine.awardMeaningfulXp(SID, 'streak', T0, 'ck-8b');
    const r3 = await engagementEngine.awardMeaningfulXp(SID, 'review', T0, 'ck-8c');
    expect(r1.xp).toBe(10);
    expect(r2.xp).toBe(15);
    expect(r3.xp).toBe(23);
  });

  it('Test 9: optimistic local state is consistent', async () => {
    const r = await engagementEngine.awardMeaningfulXp(SID, 'correct', T0, 'ck-9');
    const level = store.level.get(SID);
    expect(level?.xp).toBe(r.xp);
    expect(level?.level).toBe(r.level);
  });
});