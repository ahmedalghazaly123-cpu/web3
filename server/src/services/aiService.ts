import { AiMode, AiProvider, UsageStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export class AiService {
  async createConversation(data: { studentId: string; title: string; titleAr?: string; mode: AiMode; courseId?: string; lessonId?: string; tags?: string[] }) {
    return prisma.aiConversation.create({
      data: {
        studentId: data.studentId,
        title: data.title,
        titleAr: data.titleAr,
        mode: data.mode,
        courseId: data.courseId,
        lessonId: data.lessonId,
        tags: data.tags ?? [],
        startedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async addMessage(data: { conversationId: string; studentId?: string; role: 'USER' | 'AI'; content: string; mode?: AiMode; citations?: string[]; sourceLessonId?: string; sourceMaterial?: string; model?: string; latencyMs?: number; costUsd?: number; safetyPassed?: boolean }) {
    return prisma.aiMessage.create({
      data: {
        conversationId: data.conversationId,
        studentId: data.studentId,
        role: data.role,
        content: data.content,
        mode: data.mode,
        citations: data.citations ?? [],
        sourceLessonId: data.sourceLessonId,
        sourceMaterial: data.sourceMaterial,
        model: data.model,
        latencyMs: data.latencyMs,
        costUsd: data.costUsd,
        safetyPassed: data.safetyPassed,
      },
    });
  }

  async listConversations(studentId: string, limit = 50) {
    return prisma.aiConversation.findMany({
      where: { studentId },
      include: { messages: { take: 5, orderBy: { createdAt: 'desc' } } },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  async getConversation(id: string, studentId: string) {
    const conversation = await prisma.aiConversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation || conversation.studentId !== studentId) throw new Error('forbidden');
    return conversation;
  }

  async recordUsage(data: { studentId?: string; feature: string; provider: AiProvider; model?: string; promptTokens?: number; completionTokens?: number; costUsd?: number; latencyMs?: number; happenedAt: Date; status: UsageStatus; courseId?: string }) {
    return prisma.aiUsageRecord.create({
      data: {
        studentId: data.studentId,
        feature: data.feature,
        provider: data.provider,
        model: data.model,
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        costUsd: data.costUsd,
        latencyMs: data.latencyMs,
        happenedAt: data.happenedAt,
        status: data.status,
        courseId: data.courseId,
      },
    });
  }

  async usageSummary(studentId: string) {
    const records = await prisma.aiUsageRecord.findMany({ where: { studentId } });
    return {
      total: records.length,
      totalCostUsd: records.reduce((s, r) => s + (r.costUsd ?? 0), 0),
      byProvider: records.reduce((acc, r) => { acc[r.provider] = (acc[r.provider] ?? 0) + 1; return acc; }, {} as Record<string, number>),
    };
  }
}

export const aiService = new AiService();
