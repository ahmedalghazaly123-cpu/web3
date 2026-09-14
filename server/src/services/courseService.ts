import { Course, EnrollmentStatus, Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export class CourseService {
  async create(data: { title: string; titleAr?: string; description: string; descriptionAr?: string; instructorId: string; instructorName: string; instructorNameAr?: string; instructorAvatar: string; category: string; categoryAr?: string; cover: string; color: string; durationMinutes: number; totalLessons: number; published?: boolean }) {
    return prisma.course.create({ data: { ...data, published: data.published ?? false } });
  }

  async list(filters: { category?: string; published?: boolean; instructorId?: string } = {}) {
    const where: any = {};
    if (filters.category) where.category = filters.category;
    if (filters.published !== undefined) where.published = filters.published;
    if (filters.instructorId) where.instructorId = filters.instructorId;
    return prisma.course.findMany({
      where,
      include: { modules: { include: { lessons: true } }, _count: { select: { enrollments: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    return prisma.course.findUnique({
      where: { id },
      include: {
        modules: { include: { lessons: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } },
        assessments: true,
        _count: { select: { enrollments: true } },
      },
    });
  }

  async update(id: string, data: Partial<{ title: string; titleAr?: string; description: string; descriptionAr?: string; published: boolean; category: string; cover: string; color: string; durationMinutes: number; totalLessons: number }>) {
    return prisma.course.update({ where: { id }, data });
  }

  async remove(id: string) {
    await prisma.course.delete({ where: { id } });
  }

  async enroll(courseId: string, studentId: string) {
    const existing = await prisma.enrollment.findFirst({ where: { courseId, studentId } });
    if (existing) throw new Error('already-enrolled');
    return prisma.enrollment.create({ data: { courseId, studentId, status: EnrollmentStatus.ACTIVE, startedAt: new Date() } });
  }

  async unenroll(courseId: string, studentId: string) {
    const enrollment = await prisma.enrollment.findFirst({ where: { courseId, studentId } });
    if (!enrollment) throw new Error('not-enrolled');
    await prisma.enrollment.delete({ where: { id: enrollment.id } });
  }

  async listEnrollments(courseId: string) {
    return prisma.enrollment.findMany({
      where: { courseId },
      include: { student: { select: { id: true, name: true, email: true, role: true } } },
    });
  }

  async progress(courseId: string, studentId: string) {
    const events = await prisma.learningEvent.count({ where: { courseId, studentId } });
    const completedLessons = await prisma.learningEvent.count({ where: { courseId, studentId, kind: 'LESSON_COMPLETED' } });
    return { events, completedLessons };
  }
}

export const courseService = new CourseService();
