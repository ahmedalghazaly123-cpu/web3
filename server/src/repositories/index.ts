import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface UserRepository {
  findById(id: string): Promise<any | null>;
  findByEmail(email: string): Promise<any | null>;
  create(data: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
}

export class PrismaUserRepository implements UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }
  async findByEmail(email: string) {
    return prisma.user.findFirst({ where: { email } });
  }
  async create(data: any) {
    return prisma.user.create({ data });
  }
  async update(id: string, data: any) {
    return prisma.user.update({ where: { id }, data });
  }
  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }
}

export interface LearningEventRepository {
  create(event: any): Promise<any>;
  findByStudent(studentId: string, limit?: number): Promise<any[]>;
}

export class PrismLearningEventRepository implements LearningEventRepository {
  async create(event: any) {
    return prisma.learningEvent.create({ data: event });
  }
  async findByStudent(studentId: string, limit = 100) {
    return prisma.learningEvent.findMany({
      where: { studentId },
      orderBy: { happenedAt: 'desc' },
      take: limit,
    });
  }
}

export interface MasteryRepository {
  upsert(record: any): Promise<any>;
  findByStudent(studentId: string): Promise<any[]>;
}

export class PrismaMasteryRepository implements MasteryRepository {
  async upsert(record: any) {
    return prisma.masteryRecord.upsert({
      where: { studentId_nodeId: { studentId: record.studentId, nodeId: record.nodeId } },
      update: record,
      create: record,
    });
  }
  async findByStudent(studentId: string) {
    return prisma.masteryRecord.findMany({ where: { studentId } });
  }
}
