import { PrismaClient, GraphNodeType, LearningEventKind, LearningEventSource, MasteryDimension, EvidenceSource, Trend } from '@prisma/client';

const prisma = new PrismaClient();

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
    // Idempotency: when a clientKey is supplied, never create a duplicate
    // (clientKey is stable across retries). Returns the existing row if present.
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

export const userService = new UserService();
export const learningEventService = new LearningEventService();
export const masteryService = new MasteryService();
