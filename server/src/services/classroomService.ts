import { PrismaClient, Role, ClassroomStatus, EnrollmentStatus, LearningEventKind, LearningEventSource, GraphNodeType, Notification } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export class ClassroomService {
  async create(data: { teacherId: string; title: string; titleAr?: string; courseId?: string; status?: ClassroomStatus }) {
    const classroom = await prisma.classroom.create({
      data: {
        teacherId: data.teacherId,
        title: data.title,
        titleAr: data.titleAr,
        courseId: data.courseId,
        status: data.status ?? ClassroomStatus.ACTIVE,
      },
    });
    return classroom;
  }

  async list(role: Role, userId: string) {
    if (role === Role.OWNER || role === Role.ADMIN) {
      return prisma.classroom.findMany({
        include: { teacher: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }
    if (role === Role.TEACHER) {
      return prisma.classroom.findMany({
        where: { teacherId: userId },
        include: { teacher: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }
    // Student: classrooms they are enrolled in
    const enrolled = await prisma.enrollment.findMany({
      where: { studentId: userId, status: EnrollmentStatus.ACTIVE },
      select: { classroomId: true },
    });
    const classroomIds = enrolled.map((e) => e.classroomId).filter((id): id is string => !!id);
    return prisma.classroom.findMany({
      where: { id: { in: classroomIds } },
      include: { teacher: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDetail(id: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('user-not-found');
    const classroom = await prisma.classroom.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        enrollments: {
          where: { status: EnrollmentStatus.ACTIVE },
          include: { student: { select: { id: true, name: true, email: true, role: true } } },
        },
      },
    });
    if (!classroom) return null;
    // Students can only view classrooms they are enrolled in
    if (user.role === Role.STUDENT) {
      const isMember = classroom.enrollments.some((e) => e.studentId === userId);
      if (!isMember) throw new Error('forbidden');
    }
    // Teachers can only view their own classrooms
    if (user.role === Role.TEACHER && classroom.teacherId !== userId) {
      throw new Error('forbidden');
    }
    return classroom;
  }

  async update(id: string, userId: string, data: Partial<{ title: string; titleAr?: string; courseId?: string; status?: ClassroomStatus }>) {
    const classroom = await prisma.classroom.findUnique({ where: { id } });
    if (!classroom) throw new Error('classroom-not-found');
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('user-not-found');
    if (user.role !== Role.OWNER && user.role !== Role.ADMIN && classroom.teacherId !== userId) {
      throw new Error('forbidden');
    }
    return prisma.classroom.update({ where: { id }, data });
  }

  async remove(id: string, userId: string) {
    const classroom = await prisma.classroom.findUnique({ where: { id } });
    if (!classroom) throw new Error('classroom-not-found');
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('user-not-found');
    if (user.role !== Role.OWNER && user.role !== Role.ADMIN && classroom.teacherId !== userId) {
      throw new Error('forbidden');
    }
    await prisma.classroom.delete({ where: { id } });
  }

  async addStudent(classId: string, email: string, teacherId: string) {
    const classroom = await prisma.classroom.findUnique({ where: { id: classId } });
    if (!classroom) throw new Error('classroom-not-found');
    const user = await prisma.user.findUnique({ where: { id: teacherId } });
    if (!user) throw new Error('user-not-found');
    if (user.role !== Role.OWNER && user.role !== Role.ADMIN && classroom.teacherId !== teacherId) {
      throw new Error('forbidden');
    }
    const student = await prisma.user.findUnique({ where: { email } });
    if (!student) throw new Error('student-not-found');
    if (student.role !== Role.STUDENT) throw new Error('not-a-student');
    const existing = await prisma.enrollment.findFirst({
      where: { studentId: student.id, classroomId: classId },
    });
    if (existing) throw new Error('already-enrolled');
if (!classroom.courseId) throw new Error('classroom-has-no-course');
    const membership = await prisma.enrollment.create({
      data: { studentId: student.id, classroomId: classId, courseId: classroom.courseId ?? classId, status: EnrollmentStatus.ACTIVE },
    });
    await prisma.notification.create({
      data: {
        userId: student.id,
        title: 'Classroom invitation',
        message: `You have been added to "${classroom.title}" by ${user.name}.`,
        category: 'classroom',
        data: { classroomId: classId, type: 'classroom-invite' } as any,
      },
    });
    return membership;
  }

  async removeStudent(classId: string, studentId: string, teacherId: string) {
    const classroom = await prisma.classroom.findUnique({ where: { id: classId } });
    if (!classroom) throw new Error('classroom-not-found');
    const user = await prisma.user.findUnique({ where: { id: teacherId } });
    if (!user) throw new Error('user-not-found');
    if (user.role !== Role.OWNER && user.role !== Role.ADMIN && classroom.teacherId !== teacherId) {
      throw new Error('forbidden');
    }
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId, classroomId: classId },
    });
    if (!enrollment) throw new Error('not-enrolled');
    await prisma.enrollment.delete({ where: { id: enrollment.id } });
  }

  async join(classId: string, studentId: string) {
    const classroom = await prisma.classroom.findUnique({ where: { id: classId } });
    if (!classroom) throw new Error('classroom-not-found');
    const existing = await prisma.enrollment.findFirst({
      where: { studentId, classroomId: classId },
    });
    if (existing) throw new Error('already-enrolled');
if (!classroom.courseId) throw new Error('classroom-has-no-course');
    const membership = await prisma.enrollment.create({
      data: { studentId, classroomId: classId, courseId: classroom.courseId ?? classId, status: EnrollmentStatus.ACTIVE },
    });
    return membership;
  }

  async leave(classId: string, studentId: string) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId, classroomId: classId },
    });
    if (!enrollment) throw new Error('not-enrolled');
    await prisma.enrollment.delete({ where: { id: enrollment.id } });
  }

  async analytics(classId: string, userId: string) {
    const classroom = await prisma.classroom.findUnique({ where: { id: classId } });
    if (!classroom) throw new Error('classroom-not-found');
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('user-not-found');
    if (user.role !== Role.OWNER && user.role !== Role.ADMIN && classroom.teacherId !== userId) {
      throw new Error('forbidden');
    }
    const [studentCount, eventCount, examCount] = await Promise.all([
      prisma.enrollment.count({ where: { classroomId: classId, status: EnrollmentStatus.ACTIVE } }),
      prisma.learningEvent.count({ where: { courseId: classroom.courseId ?? undefined } }),
      prisma.examResult.count({ where: { assessment: { courseId: classroom.courseId ?? undefined } } }),
    ]);
    return {
      classroomId: classId,
      studentCount,
      eventCount,
      examCount,
    };
  }
}

export const classroomService = new ClassroomService();