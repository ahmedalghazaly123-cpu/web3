import { PrismaClient, GraphNodeType, LearningEventKind, LearningEventSource, MasteryDimension, EvidenceSource, Trend } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export class UserService {
  async getUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, locale: true, createdAt: true },
    });
  }

  async listUsers(filters: { role?: string; search?: string } = {}) {
    const where: any = {};
    if (filters.role) where.role = filters.role;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return prisma.user.findMany({
      where,
      select: { id: true, email: true, name: true, role: true, locale: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUser(id: string, data: { name?: string; locale?: string; timezone?: string }) {
    return prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, locale: true, createdAt: true },
    });
  }

  async deleteUser(id: string) {
    await prisma.user.delete({ where: { id } });
  }
}

export class LearningEventService {
  async recordEvent(event: {
    studentId: string;
    kind: LearningEventKind;
    source: LearningEventSource;
    happenedAt: Date;
    nodeId?: string;
    nodeType?: GraphNodeType;
    courseId?: string;
    lessonId?: string;
    questionId?: string;
    sessionId?: string;
    assessmentId?: string;
    payload?: any;
    clientKey?: string;
  }) {
    if (event.clientKey) {
      const existing = await prisma.learningEvent.findFirst({
        where: { studentId: event.studentId, kind: event.kind, clientKey: event.clientKey },
      });
      if (existing) return existing;
    }
    return prisma.learningEvent.create({ data: event });
  }

  async findEventByClientKey(studentId: string, kind: LearningEventKind, clientKey: string) {
    return prisma.learningEvent.findFirst({
      where: { studentId, kind, clientKey },
    });
  }

  async getEventsForStudent(studentId: string, limit = 100) {
    return prisma.learningEvent.findMany({
      where: { studentId },
      orderBy: { happenedAt: 'desc' },
      take: limit,
    });
  }
}

export class MasteryService {
  async upsertMastery(record: {
    studentId: string;
    nodeId: string;
    nodeType: GraphNodeType;
    mastery: number;
    dimensions?: any;
    attempts: number;
    lastPracticedAt: Date;
    nextReviewAt?: Date;
    confidence?: number;
    trend?: Trend;
    weak?: boolean;
    mastered?: boolean;
    lastEvidenceNote?: string;
  }) {
    const data: any = { ...record };
    return prisma.masteryRecord.upsert({
      where: { studentId_nodeId: { studentId: record.studentId, nodeId: record.nodeId } },
      update: data,
      create: data,
    });
  }

  async getMasteryForStudent(studentId: string) {
    return prisma.masteryRecord.findMany({ where: { studentId } });
  }
}

export class PlanService {
  async listPlans(studentId: string) {
    return prisma.planItem.findMany({
      where: { studentId },
      orderBy: { scheduledFor: 'asc' },
    });
  }

  async upsertPlan(item: {
    studentId: string;
    id?: string;
    kind: string;
    title: string;
    titleAr?: string;
    courseId?: string;
    lessonId?: string;
    topic?: string;
    estimatedMinutes: number;
    scheduledFor: Date;
    priority: string;
    status: string;
    reason?: string;
  }) {
    const normalizeKind = (k: string): string => {
      const map: Record<string, string> = {
        lesson: 'LESSON', lessons: 'LESSON',
        practice: 'PRACTICE',
        quiz: 'QUIZ', quizzes: 'QUIZ',
        exam: 'EXAM', exams: 'EXAM',
        revision: 'REVISION',
        remediate: 'REMEDIATION', remedy: 'REMEDIATION',
        challenge: 'CHALLENGE', challenges: 'CHALLENGE',
        break: 'BREAK',
      };
      return map[k.toLowerCase()] ?? k.toUpperCase();
    };
    const normalizeStatus = (s: string): string => {
      const map: Record<string, string> = {
        pending: 'PENDING',
        in_progress: 'IN_PROGRESS', 'in-progress': 'IN_PROGRESS', 'inprogress': 'IN_PROGRESS',
        completed: 'COMPLETED', complete: 'COMPLETED',
        missed: 'MISSED',
        skipped: 'SKIPPED',
      };
      return map[s.toLowerCase()] ?? s.toUpperCase();
    };
    const normalizePriority = (p: string): string => {
      const map: Record<string, string> = {
        high: 'HIGH', h: 'HIGH',
        medium: 'MEDIUM', med: 'MEDIUM', m: 'MEDIUM', normal: 'MEDIUM',
        low: 'LOW', l: 'LOW',
      };
      return map[p.toLowerCase()] ?? p.toUpperCase();
    };
    const data: any = {
      studentId: item.studentId,
      kind: normalizeKind(item.kind),
      title: item.title,
      titleAr: item.titleAr,
      courseId: item.courseId,
      lessonId: item.lessonId,
      topic: item.topic,
      estimatedMinutes: item.estimatedMinutes,
      scheduledFor: item.scheduledFor,
      priority: normalizePriority(item.priority),
      status: normalizeStatus(item.status),
      reason: item.reason,
    };
    if (item.id) {
      return prisma.planItem.update({ where: { id: item.id }, data });
    }
    return prisma.planItem.create({ data });
  }

  async updatePlanStatus(id: string, status: string) {
    const normalizeStatus = (s: string): string => {
      const map: Record<string, string> = {
        pending: 'PENDING',
        in_progress: 'IN_PROGRESS', 'in-progress': 'IN_PROGRESS', 'inprogress': 'IN_PROGRESS',
        completed: 'COMPLETED', complete: 'COMPLETED',
        missed: 'MISSED',
        skipped: 'SKIPPED',
      };
      return map[s.toLowerCase()] ?? s.toUpperCase();
    };
    return prisma.planItem.update({ where: { id }, data: { status: normalizeStatus(status) as any } });
  }
}

export class ExamResultService {
  async saveExamResult(result: {
    studentId: string;
    assessmentId: string;
    startedAt: Date;
    finishedAt?: Date;
    submitted: boolean;
    totalQuestions: number;
    correct: number;
    score: number;
    timeUsedSeconds?: number;
    questionResults?: any;
    analysis?: any;
  }) {
    return prisma.examResult.create({ data: result });
  }

  async listExamResults(studentId: string) {
    return prisma.examResult.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export class AuditLogService {
  async log(entry: {
    actorId?: string;
    action: string;
    targetType?: string;
    targetId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }) {
    return prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        metadata: entry.metadata as any,
      },
    });
  }
}

export const userService = new UserService();
export const learningEventService = new LearningEventService();
export const masteryService = new MasteryService();
export const planService = new PlanService();
export const examResultService = new ExamResultService();
export const auditLogService = new AuditLogService();
export { xpService } from './xpService.js';

export { classroomService } from './classroomService.js';
export { notificationService } from './notificationService.js';
export { fileService } from './fileService.js';
export { assignmentService } from './assignmentService.js';
export { aiService } from './aiService.js';
export { courseService } from './courseService.js';
export { assessmentService } from './assessmentService.js';
export { retentionService } from './retentionService.js';
export { startRetentionScheduler } from './retentionScheduler.js';
export { privacyService } from './privacyService.js';