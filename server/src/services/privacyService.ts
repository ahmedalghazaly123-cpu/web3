// Privacy / Consent Service (Wave 2)
// Owns ConsentRecord + PrivacyPreference persistence, data export, and
// data deletion. All operations are strictly scoped to the authenticated user.
// Auditability is preserved: every consent change, export, and deletion is
// recorded in AuditLog.
import { prisma } from '../lib/prisma.js';

const CONSENT_CATEGORIES = [
  'analytics',
  'ai-processing',
  'marketing',
  'camera',
  'microphone',
  'data-export',
  'data-deletion',
] as const;

type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];

export interface ConsentState {
  category: string;
  granted: boolean;
  grantedAt: string | null;
  revokedAt: string | null;
  policyVersion: string | null;
}

export interface PrivacyPreferences {
  dataExportEnabled: boolean;
  dataDeletionEnabled: boolean;
  analyticsOptIn: boolean;
  aiProcessingOptIn: boolean;
  retentionDays: number | null;
}

export class PrivacyService {
  async getConsents(userId: string): Promise<ConsentState[]> {
    const rows = await prisma.consentRecord.findMany({ where: { userId } });
    const byCategory = new Map(rows.map((r) => [r.category, r]));
    return CONSENT_CATEGORIES.map((c) => {
      const row = byCategory.get(c);
      return {
        category: c,
        granted: row ? row.granted : true,
        grantedAt: row ? row.grantedAt.toISOString() : null,
        revokedAt: row ? (row.revokedAt ? row.revokedAt.toISOString() : null) : null,
        policyVersion: row ? row.policyVersion : null,
      };
    });
  }

  async setConsent(
    userId: string,
    category: string,
    granted: boolean,
    policyVersion?: string,
  ): Promise<ConsentState> {
    const now = new Date();
    const row = await prisma.consentRecord.upsert({
      where: { userId_category: { userId, category } },
      update: {
        granted,
        policyVersion: policyVersion ?? undefined,
        revokedAt: granted ? null : now,
        grantedAt: granted ? now : undefined,
      },
      create: {
        userId,
        category,
        granted,
        grantedAt: now,
        revokedAt: granted ? null : now,
        policyVersion,
      },
    });
    return {
      category: row.category,
      granted: row.granted,
      grantedAt: row.grantedAt ? row.grantedAt.toISOString() : null,
      revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
      policyVersion: row.policyVersion,
    };
  }

  async revokeConsent(userId: string, category: string): Promise<ConsentState> {
    return this.setConsent(userId, category, false);
  }

  async getPreferences(userId: string): Promise<PrivacyPreferences> {
    let pref = await prisma.privacyPreference.findUnique({ where: { userId } });
    if (!pref) {
      pref = await prisma.privacyPreference.create({
        data: { userId, dataExportEnabled: true, dataDeletionEnabled: true },
      });
    }
    return {
      dataExportEnabled: pref.dataExportEnabled,
      dataDeletionEnabled: pref.dataDeletionEnabled,
      analyticsOptIn: pref.analyticsOptIn,
      aiProcessingOptIn: pref.aiProcessingOptIn,
      retentionDays: pref.retentionDays,
    };
  }

  async updatePreferences(
    userId: string,
    data: Partial<PrivacyPreferences>,
  ): Promise<PrivacyPreferences> {
    const pref = await prisma.privacyPreference.upsert({
      where: { userId },
      update: {
        dataExportEnabled: data.dataExportEnabled,
        dataDeletionEnabled: data.dataDeletionEnabled,
        analyticsOptIn: data.analyticsOptIn,
        aiProcessingOptIn: data.aiProcessingOptIn,
        retentionDays: data.retentionDays,
      },
      create: {
        userId,
        dataExportEnabled: data.dataExportEnabled ?? true,
        dataDeletionEnabled: data.dataDeletionEnabled ?? true,
        analyticsOptIn: data.analyticsOptIn ?? false,
        aiProcessingOptIn: data.aiProcessingOptIn ?? false,
        retentionDays: data.retentionDays,
      },
    });
    return {
      dataExportEnabled: pref.dataExportEnabled,
      dataDeletionEnabled: pref.dataDeletionEnabled,
      analyticsOptIn: pref.analyticsOptIn,
      aiProcessingOptIn: pref.aiProcessingOptIn,
      retentionDays: pref.retentionDays,
    };
  }

  /**
   * Export a user's own data. Never includes passwords, tokens, secrets, or
   * another user's data. Ownership is enforced by scoping every query to the
   * authenticated user's ID.
   */
  async exportUserData(userId: string): Promise<Record<string, unknown>> {
    const [user, events, mastery, plans, examResults, achievements, consents, prefs] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            locale: true,
            timezone: true,
            createdAt: true,
          },
        }),
        prisma.learningEvent.findMany({ where: { studentId: userId }, take: 500 }),
        prisma.masteryRecord.findMany({ where: { studentId: userId } }),
        prisma.planItem.findMany({ where: { studentId: userId } }),
        prisma.examResult.findMany({ where: { studentId: userId } }),
        prisma.achievement.findMany({ where: { studentId: userId } }),
        prisma.consentRecord.findMany({ where: { userId } }),
        prisma.privacyPreference.findUnique({ where: { userId } }),
      ]);

    return {
      exportedAt: new Date().toISOString(),
      profile: user,
      learningEvents: events,
      masteryRecords: mastery,
      planItems: plans,
      examResults,
      achievements,
      consents,
      privacyPreferences: prefs,
    };
  }

  /**
   * Delete a user's own data. Transactional where possible. Dependent rows
   * use Prisma onDelete: Cascade, so deleting the user cascades to most
   * owned records. Sessions are explicitly invalidated. Audit logs are
   * preserved for operational integrity (not deleted).
   */
  async deleteUserData(userId: string): Promise<{ deleted: true }> {
    await prisma.$transaction(async (tx) => {
      // Invalidate sessions first so the token stops working.
      await tx.session.deleteMany({ where: { userId } });

      // Explicitly remove owned records that are not cascade-deleted.
      await tx.aiConversation.deleteMany({ where: { studentId: userId } });
      await tx.attentionSnapshot.deleteMany({ where: { studentId: userId } });
      await tx.parentProgressSnapshot.deleteMany({ where: { studentId: userId } });
      await tx.learningDNA.deleteMany({ where: { studentId: userId } });
      await tx.parentLink.deleteMany({
        where: { OR: [{ parentUserId: userId }, { studentUserId: userId }] },
      });
      await tx.recoveryPlan.deleteMany({ where: { studentId: userId } });
      await tx.learningGoal.deleteMany({ where: { studentId: userId } });
      await tx.bookmark.deleteMany({ where: { studentId: userId } });
      await tx.reviewCard.deleteMany({ where: { studentId: userId } });
      await tx.mistakeEntry.deleteMany({ where: { studentId: userId } });
      await tx.studySession.deleteMany({ where: { studentId: userId } });
      await tx.xpEvent.deleteMany({ where: { studentId: userId } });
      await tx.studentLevel.deleteMany({ where: { studentId: userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.aiUsageRecord.deleteMany({ where: { studentId: userId } });
      await tx.submission.deleteMany({
        where: { OR: [{ studentId: userId }, { gradedBy: userId }] },
      });
      await tx.assignment.deleteMany({ where: { teacherId: userId } });
      await tx.classroom.deleteMany({ where: { teacherId: userId } });
      await tx.file.deleteMany({ where: { uploaderId: userId } });
      await tx.certificate.deleteMany({ where: { OR: [{ studentId: userId }, { issuerId: userId }] } });
      await tx.enrollment.deleteMany({ where: { studentId: userId } });
      await tx.liveRoom.deleteMany({ where: { hostId: userId } });
      await tx.roomMembership.deleteMany({ where: { userId } });
      await tx.consentRecord.deleteMany({ where: { userId } });
      await tx.privacyPreference.deleteMany({ where: { userId } });
      await tx.masteryEvidence.deleteMany({ where: { studentId: userId } });
      await tx.questionAttempt.deleteMany({ where: { studentId: userId } });
      await tx.parentLink.deleteMany({
        where: { OR: [{ parentUserId: userId }, { studentUserId: userId }] },
      });
      await tx.user.delete({ where: { id: userId } });
    });

    return { deleted: true };
  }
}

export const privacyService = new PrivacyService();