import { PrismaClient, FileCategory, FileVisibility } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import crypto from 'crypto';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_MIME: Record<string, FileCategory> = {
  'image/png': 'IMAGE', 'image/jpeg': 'IMAGE', 'image/gif': 'IMAGE', 'image/webp': 'IMAGE',
  'application/pdf': 'PDF',
  'application/msword': 'DOC', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOC',
  'application/vnd.ms-powerpoint': 'PPT', 'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPT',
  'text/plain': 'TXT',
  'audio/mpeg': 'AUDIO', 'audio/wav': 'AUDIO', 'audio/ogg': 'AUDIO',
  'video/mp4': 'VIDEO', 'video/webm': 'VIDEO',
};

export class FileService {
  validate(mimeType: string, sizeBytes: number): { valid: boolean; category?: FileCategory; error?: string } {
    if (sizeBytes > MAX_FILE_SIZE) return { valid: false, error: 'file-too-large' };
    const category = ALLOWED_MIME[mimeType];
    if (!category) return { valid: false, error: 'unsupported-mime' };
    return { valid: true, category };
  }

  async create(data: {
    uploaderId: string;
    filename: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    category: FileCategory;
    url: string;
    storageKey: string;
    checksum?: string;
    title?: string;
    description?: string;
    tags?: string[];
    visibility?: FileVisibility;
    classroomId?: string;
  }) {
    const validation = this.validate(data.mimeType, data.sizeBytes);
    if (!validation.valid) throw new Error(validation.error!);
    return prisma.file.create({
      data: {
        uploaderId: data.uploaderId,
        filename: this.sanitizeFilename(data.filename),
        originalName: data.originalName,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        category: data.category,
        url: data.url,
        storageKey: data.storageKey,
        checksum: data.checksum ?? crypto.createHash('sha256').update(data.storageKey).digest('hex'),
        title: data.title,
        description: data.description,
        tags: data.tags ?? [],
        visibility: data.visibility ?? FileVisibility.PRIVATE,
        classroomId: data.classroomId,
      },
    });
  }

  async getMetadata(id: string, requesterId: string) {
    const file = await prisma.file.findUnique({ where: { id, deletedAt: null } });
    if (!file) throw new Error('file-not-found');
    const user = await prisma.user.findUnique({ where: { id: requesterId } });
    if (!user) throw new Error('user-not-found');
    const isOwner = file.uploaderId === requesterId;
    const isPublic = file.visibility === FileVisibility.PUBLIC;
    const isClassroom = file.visibility === FileVisibility.CLASSROOM && file.classroomId
      ? await this.canAccessClassroom(file.classroomId, requesterId)
      : false;
    const isAdmin = user.role === 'ADMIN' || user.role === 'OWNER';
    if (!isOwner && !isPublic && !isClassroom && !isAdmin) {
      throw new Error('forbidden');
    }
    return file;
  }

  async listForUser(requesterId: string, filters: { category?: FileCategory; classroomId?: string; limit?: number } = {}) {
    const user = await prisma.user.findUnique({ where: { id: requesterId } });
    if (!user) throw new Error('user-not-found');
    const where: any = { deletedAt: null };
    if (filters.category) where.category = filters.category;
    if (filters.classroomId) where.classroomId = filters.classroomId;
    if (user.role === 'STUDENT') {
      where.OR = [
        { uploaderId: requesterId },
        { visibility: FileVisibility.PUBLIC },
        { AND: [{ visibility: FileVisibility.CLASSROOM }, { classroom: { enrollments: { some: { studentId: requesterId } } } }] },
      ];
    }
    return prisma.file.findMany({
      where,
      take: filters.limit ?? 50,
      include: { uploader: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(id: string, requesterId: string) {
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) throw new Error('file-not-found');
    const user = await prisma.user.findUnique({ where: { id: requesterId } });
    if (!user) throw new Error('user-not-found');
    const isOwner = file.uploaderId === requesterId;
    const isAdmin = user.role === 'ADMIN' || user.role === 'OWNER';
    if (!isOwner && !isAdmin) throw new Error('forbidden');
    return prisma.file.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /** Patch the public download URL after an upload creates the row. */
  async setUrl(id: string, url: string) {
    return prisma.file.update({ where: { id }, data: { url } });
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255);
  }

  private async canAccessClassroom(classroomId: string, userId: string): Promise<boolean> {
    const enrollment = await prisma.enrollment.findFirst({ where: { classroomId, studentId: userId } });
    const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
    return !!enrollment || classroom?.teacherId === userId;
  }
}

export const fileService = new FileService();