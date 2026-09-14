// Data Retention Service — automatic enforcement of per-user `retentionDays`.
//
// Users set `retentionDays` via PUT /api/v1/privacy/preferences. This service
// deletes time-series / ephemeral rows older than that window, per user:
//   - learning_events (by happenedAt)
//   - xp_events (by happenedAt)
//   - study_sessions (by startedAt)
//   - question_attempts (by answeredAt)
//   - ai_usage records (by happenedAt)
//   - expired sessions (by expiresAt, global — not per-user)
//   - soft-deleted files (deletedAt set, by deletedAt) — metadata rows only;
//     stored bytes under server/uploads are left for operator cleanup.
//   - notifications older than the window (by createdAt)
//
// Safety rules:
//   - Users with retentionDays = null/undefined are SKIPPED entirely.
//   - Core/domain records are NEVER touched: users, courses, enrollments,
//     classrooms, assignments, submissions, certificates, mastery, plans,
//     review cards, mistakes, AI conversations, consents, audit logs.
//   - Every run writes one AuditLog row per affected user
//     (action 'retention.purge', actorId null = system).

import { prisma } from '../lib/prisma.js';

export interface RetentionDeleted {
  learningEvents: number;
  xpEvents: number;
  studySessions: number;
  questionAttempts: number;
  aiUsage: number;
  softDeletedFiles: number;
  notifications: number;
}

export interface RetentionRunResult {
  ranAt: string;
  usersScanned: number;
  usersPurged: number;
  deleted: RetentionDeleted;
  expiredSessionsDeleted: number;
  errors: { userId: string; error: string }[];
}

const EMPTY: RetentionDeleted = {
  learningEvents: 0,
  xpEvents: 0,
  studySessions: 0,
  questionAttempts: 0,
  aiUsage: 0,
  softDeletedFiles: 0,
  notifications: 0,
};

export class RetentionService {
  async purgeUser(userId: string): Promise<RetentionDeleted> {
    const pref = await prisma.privacyPreference.findUnique({ where: { userId } });
    if (!pref?.retentionDays || pref.retentionDays <= 0) return { ...EMPTY };
    const cutoff = new Date(Date.now() - pref.retentionDays * 24 * 60 * 60 * 1000);

    const [
      learningEvents,
      xpEvents,
      studySessions,
      questionAttempts,
      aiUsage,
      softDeletedFiles,
      notifications,
    ] = await Promise.all([
      prisma.learningEvent.deleteMany({ where: { studentId: userId, happenedAt: { lt: cutoff } } }),
      prisma.xpEvent.deleteMany({ where: { studentId: userId, happenedAt: { lt: cutoff } } }),
      prisma.studySession.deleteMany({ where: { studentId: userId, startedAt: { lt: cutoff } } }),
      prisma.questionAttempt.deleteMany({ where: { studentId: userId, answeredAt: { lt: cutoff } } }),
      prisma.aiUsageRecord.deleteMany({ where: { studentId: userId, happenedAt: { lt: cutoff } } }),
      prisma.file.deleteMany({ where: { uploaderId: userId, deletedAt: { lt: cutoff } } }),
      prisma.notification.deleteMany({ where: { userId, createdAt: { lt: cutoff } } }),
    ]);

    const counts: RetentionDeleted = {
      learningEvents: learningEvents.count,
      xpEvents: xpEvents.count,
      studySessions: studySessions.count,
      questionAttempts: questionAttempts.count,
      aiUsage: aiUsage.count,
      softDeletedFiles: softDeletedFiles.count,
      notifications: notifications.count,
    };
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total > 0) {
      await prisma.auditLog.create({
        data: {
          actorId: null,
          action: 'retention.purge',
          targetType: 'user',
          targetId: userId,
          metadata: { retentionDays: pref.retentionDays, cutoff: cutoff.toISOString(), ...counts } as any,
        },
      });
    }
    return counts;
  }

  async purgeExpiredSessions(): Promise<number> {
    const r = await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    return r.count;
  }

  async runAll(): Promise<RetentionRunResult> {
    const result: RetentionRunResult = {
      ranAt: new Date().toISOString(),
      usersScanned: 0,
      usersPurged: 0,
      deleted: { ...EMPTY },
      expiredSessionsDeleted: 0,
      errors: [],
    };
    const optedIn = await prisma.privacyPreference.findMany({
      where: { retentionDays: { not: null } },
      select: { userId: true },
    });
    result.usersScanned = optedIn.length;
    for (const { userId } of optedIn) {
      try {
        const counts = await this.purgeUser(userId);
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        if (total > 0) result.usersPurged += 1;
        (Object.keys(result.deleted) as (keyof RetentionDeleted)[]).forEach((k) => {
          result.deleted[k] += counts[k];
        });
      } catch (e: any) {
        result.errors.push({ userId, error: String(e?.message ?? e) });
      }
    }
    try {
      result.expiredSessionsDeleted = await this.purgeExpiredSessions();
    } catch (e: any) {
      result.errors.push({ userId: '*sessions*', error: String(e?.message ?? e) });
    }
    return result;
  }
}

export const retentionService = new RetentionService();
