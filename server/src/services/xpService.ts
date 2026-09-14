// Canonical XP / Gamification Service (Phase 24)
// Single source of truth for XP awarding. Idempotent, concurrency-safe, atomic.
import { PrismaClient, XpEventKind } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export interface AwardXpInput {
  studentId: string;
  kind: XpEventKind;
  amount: number;
  source: string;
  clientKey?: string;
  metadata?: Record<string, unknown>;
  happenedAt: Date;
}

export interface AwardXpResult {
  xp: number;
  level: number;
  xpToNext: number;
  awarded: boolean;
  previousXp: number;
  previousLevel: number;
}

function levelFor(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 100)) + 1;
}

function xpToNextFor(totalXp: number, level: number): number {
  return Math.max(0, level * level * 100 - totalXp);
}

export class XpService {
  async award(input: AwardXpInput): Promise<AwardXpResult> {
    const { studentId, kind, amount, source, clientKey, metadata, happenedAt } = input;

    if (amount <= 0) {
      throw new Error('XP amount must be positive');
    }

    // Ensure student level row exists
    let levelRow = await prisma.studentLevel.findUnique({ where: { studentId } });
    if (!levelRow) {
      levelRow = await prisma.studentLevel.create({
        data: { studentId, xp: 0, level: 1, xpToNext: 100, streak: 0, longestStreak: 0, lastActiveAt: happenedAt },
      });
    }

    const previousXp = levelRow.xp;
    const previousLevel = levelRow.level;

    // Idempotency pre-check (outside the transaction): if a row with this
    // (studentId, clientKey) already exists, return it as a duplicate without
    // touching the transaction. This matters because in PostgreSQL a unique
    // violation aborts the whole transaction, so a SELECT issued *inside* the
    // same aborted tx would fail with "current transaction is aborted".
    if (clientKey) {
      const dup = await prisma.xpEvent.findFirst({ where: { studentId, clientKey } });
      if (dup) {
        return {
          awarded: false,
          xp: previousXp,
          level: previousLevel,
          xpToNext: xpToNextFor(previousXp, previousLevel),
          previousXp,
          previousLevel,
        };
      }
    }

    // Atomic transaction: idempotent insert + level update together.
    // The unique constraint on (studentId, clientKey) guarantees exactly-once
    // even under concurrent duplicate requests.
    const result = await prisma.$transaction(async (tx) => {
      let created;
      if (clientKey) {
        // Try insert; if duplicate key, treat as already awarded.
        try {
          created = await tx.xpEvent.create({
            data: {
              studentId,
              kind,
              amount,
              source,
              clientKey,
              metadata: metadata as any,
              happenedAt,
            },
          });
        } catch (e: any) {
          if (e.code === 'P2002' || /unique constraint/i.test(String(e.message || ''))) {
            // Concurrent duplicate: the unique constraint aborted this
            // transaction (PostgreSQL), so NO further query may run on `tx`.
            // Signal with a sentinel; the winner's row is re-read outside
            // the transaction in the .catch() below.
            const dup = new Error('xp-duplicate') as Error & { code?: string };
            dup.code = 'XP_DUPLICATE';
            throw dup;
          }
          throw e;
        }
      } else {
        created = await tx.xpEvent.create({
          data: {
            studentId,
            kind,
            amount,
            source,
            clientKey: undefined,
            metadata: metadata as any,
            happenedAt,
          },
        });
      }

      const total = previousXp + amount;
      const level = levelFor(total);
      const xpToNext = xpToNextFor(total, level);

      await tx.studentLevel.update({
        where: { studentId },
        data: { xp: total, level, xpToNext, lastActiveAt: happenedAt },
      });

      return {
        awarded: true,
        xp: total,
        level,
        xpToNext,
        previousXp,
        previousLevel,
      };
    }).catch(async (e: any) => {
      // A concurrent identical request won the race. Re-read the winner's
      // row OUTSIDE the aborted transaction and report a clean duplicate.
      if (e?.code === 'XP_DUPLICATE' && clientKey) {
        const fresh = await prisma.studentLevel.findUnique({ where: { studentId } });
        const cur = fresh ?? { xp: previousXp, level: previousLevel };
        return {
          awarded: false,
          xp: cur.xp,
          level: cur.level,
          xpToNext: xpToNextFor(cur.xp, cur.level),
          previousXp: cur.xp,
          previousLevel: cur.level,
        };
      }
      throw e;
    });

    return result;
  }

  async getStudentLevel(studentId: string) {
    let row = await prisma.studentLevel.findUnique({ where: { studentId } });
    if (!row) {
      row = await prisma.studentLevel.create({
        data: { studentId, xp: 0, level: 1, xpToNext: 100, streak: 0, longestStreak: 0, lastActiveAt: new Date() },
      });
    }
    return row;
  }

  async listEvents(studentId: string, limit = 100) {
    return prisma.xpEvent.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
    });
  }
}

export const xpService = new XpService();