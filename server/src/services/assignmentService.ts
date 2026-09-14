import { Role, AssignmentType, AssignmentStatus, SubmissionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export class AssignmentService {
  async create(data: {
    teacherId: string;
    classroomId?: string;
    title: string;
    titleAr?: string;
    description?: string;
    descriptionAr?: string;
    type: AssignmentType;
    status: AssignmentStatus;
    dueAt?: Date;
    maxScore: number;
    allowResubmission: boolean;
    lessonId?: string;
    courseId?: string;
  }) {
    return prisma.assignment.create({
      data: {
        teacherId: data.teacherId,
        classroomId: data.classroomId,
        title: data.title,
        titleAr: data.titleAr,
        description: data.description,
        descriptionAr: data.descriptionAr,
        type: data.type,
        status: data.status,
        dueAt: data.dueAt,
        maxScore: data.maxScore,
        allowResubmission: data.allowResubmission,
        lessonId: data.lessonId,
        courseId: data.courseId,
      },
    });
  }

  async list(role: Role, userId: string, classroomId?: string) {
    const where: any = {};
    if (classroomId) where.classroomId = classroomId;
    if (role === Role.TEACHER) where.teacherId = userId;
    return prisma.assignment.findMany({
      where,
      include: {
        teacher: { select: { id: true, name: true } },
        classroom: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDetail(id: string, requesterId: string) {
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        classroom: { select: { id: true, title: true } },
        submissions: { include: { student: { select: { id: true, name: true, email: true } } } },
      },
    });
    if (!assignment) return null;
    const user = await prisma.user.findUnique({ where: { id: requesterId } });
    if (!user) throw new Error('user-not-found');
    const isTeacher = assignment.teacherId === requesterId;
    const isStudent = assignment.submissions.some((s) => s.studentId === requesterId);
    const isAdmin = user.role === Role.ADMIN || user.role === Role.OWNER;
    if (!isTeacher && !isStudent && !isAdmin) throw new Error('forbidden');
    return assignment;
  }

  async update(id: string, requesterId: string, data: Partial<{
    title: string; titleAr?: string; description?: string; descriptionAr?: string;
    type: AssignmentType; status: AssignmentStatus; dueAt?: Date;
    maxScore: number; allowResubmission: boolean; classroomId?: string;
  }>) {
    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment) throw new Error('assignment-not-found');
    const user = await prisma.user.findUnique({ where: { id: requesterId } });
    if (!user) throw new Error('user-not-found');
    if (user.role !== Role.OWNER && user.role !== Role.ADMIN && assignment.teacherId !== requesterId) {
      throw new Error('forbidden');
    }
    return prisma.assignment.update({ where: { id }, data });
  }

  async publish(id: string, requesterId: string) {
    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment) throw new Error('assignment-not-found');
    const user = await prisma.user.findUnique({ where: { id: requesterId } });
    if (!user) throw new Error('user-not-found');
    if (user.role !== Role.OWNER && user.role !== Role.ADMIN && assignment.teacherId !== requesterId) {
      throw new Error('forbidden');
    }
    return prisma.assignment.update({ where: { id }, data: { status: AssignmentStatus.PUBLISHED } });
  }

  async remove(id: string, requesterId: string) {
    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment) throw new Error('assignment-not-found');
    const user = await prisma.user.findUnique({ where: { id: requesterId } });
    if (!user) throw new Error('user-not-found');
    if (user.role !== Role.OWNER && user.role !== Role.ADMIN && assignment.teacherId !== requesterId) {
      throw new Error('forbidden');
    }
    await prisma.assignment.delete({ where: { id } });
  }

  async submit(assignmentId: string, studentId: string, body: { content?: string; fileIds?: string[]; answers?: any }) {
    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new Error('assignment-not-found');
    if (assignment.status !== AssignmentStatus.PUBLISHED) throw new Error('assignment-closed');
    const existing = await prisma.submission.findFirst({ where: { assignmentId, studentId } });
    if (existing && !assignment.allowResubmission && existing.status !== SubmissionStatus.RETURNED) {
      throw new Error('no-resubmission');
    }
    if (existing && assignment.allowResubmission) {
      return prisma.submission.update({
        where: { id: existing.id },
        data: {
          content: body.content,
          fileIds: body.fileIds ?? [],
          answers: body.answers,
          status: SubmissionStatus.RESUBMITTED,
          resubmittedAt: new Date(),
        },
      });
    }
    return prisma.submission.create({
      data: {
        assignmentId,
        studentId,
        content: body.content,
        fileIds: body.fileIds ?? [],
        answers: body.answers,
        status: SubmissionStatus.SUBMITTED,
      },
    });
  }

  async listSubmissions(assignmentId: string, requesterId: string) {
    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new Error('assignment-not-found');
    const user = await prisma.user.findUnique({ where: { id: requesterId } });
    if (!user) throw new Error('user-not-found');
    const isTeacher = assignment.teacherId === requesterId;
    const isAdmin = user.role === Role.ADMIN || user.role === Role.OWNER;
    if (!isTeacher && !isAdmin) throw new Error('forbidden');
    return prisma.submission.findMany({
      where: { assignmentId },
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async grade(submissionId: string, teacherId: string, body: { score: number; feedback?: string; feedbackAr?: string }) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assignment: true },
    });
    if (!submission) throw new Error('submission-not-found');
    if (submission.assignment.teacherId !== teacherId) throw new Error('forbidden');
    if (body.score > submission.assignment.maxScore) throw new Error('score-too-high');
    return prisma.submission.update({
      where: { id: submissionId },
      data: {
        score: body.score,
        feedback: body.feedback,
        feedbackAr: body.feedbackAr,
        status: SubmissionStatus.GRADED,
        gradedAt: new Date(),
        gradedBy: teacherId,
      },
    });
  }
}

export const assignmentService = new AssignmentService();
