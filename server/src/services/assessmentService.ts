import { AssessmentType, QuestionType, CognitiveLevel, AttemptMode, Question } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export class AssessmentService {
  async createQuestion(data: {
    courseId?: string; lessonId?: string; topic: string; topicAr?: string;
    skillId?: string; conceptId?: string; type: QuestionType; difficulty: number;
    body: string; bodyAr?: string; options?: string[]; correctOptionIndex?: number;
    correctAnswer: string; explanation: string; explanationAr?: string;
    sourceLessonId?: string; sourceMaterial?: string; tags?: string[];
    cognitiveLevel?: CognitiveLevel;
  }) {
    return prisma.question.create({ data: { ...data, options: data.options ?? [], tags: data.tags ?? [] } });
  }

  async listQuestions(filters: { courseId?: string; type?: QuestionType; difficulty?: number; limit?: number } = {}) {
    const where: any = {};
    if (filters.courseId) where.courseId = filters.courseId;
    if (filters.type) where.type = filters.type;
    if (filters.difficulty) where.difficulty = filters.difficulty;
    return prisma.question.findMany({ where, take: filters.limit ?? 100 });
  }

  async getQuestion(id: string) {
    return prisma.question.findUnique({ where: { id } });
  }

  async createAssessment(data: {
    title: string; titleAr?: string; type: AssessmentType; courseId?: string; lessonId?: string;
    questionIds: string[]; timeLimitSeconds?: number; passingScore: number;
    randomized?: boolean; shuffleQuestions?: boolean; shuffleOptions?: boolean; adaptive?: boolean;
    topicCoverage?: any; difficultyDistribution?: any;
  }) {
    const assessment = await prisma.assessment.create({
      data: {
        title: data.title, titleAr: data.titleAr, type: data.type,
        courseId: data.courseId, lessonId: data.lessonId,
        timeLimitSeconds: data.timeLimitSeconds, passingScore: data.passingScore,
        randomized: data.randomized ?? false, shuffleQuestions: data.shuffleQuestions ?? false,
        shuffleOptions: data.shuffleOptions ?? false, adaptive: data.adaptive ?? false,
        topicCoverage: data.topicCoverage, difficultyDistribution: data.difficultyDistribution,
        questionIds: data.questionIds,
      },
    });
    for (let i = 0; i < data.questionIds.length; i++) {
      await prisma.assessmentQuestion.create({
        data: { assessmentId: assessment.id, questionId: data.questionIds[i], order: i },
      });
    }
    return this.getAssessment(assessment.id);
  }

  async getAssessment(id: string) {
    return prisma.assessment.findUnique({
      where: { id },
      include: {
        assessmentQuestions: { include: { question: true }, orderBy: { order: 'asc' } },
        course: { select: { id: true, title: true } },
      },
    });
  }

  async listAssessments(filters: { courseId?: string; type?: AssessmentType } = {}) {
    const where: any = {};
    if (filters.courseId) where.courseId = filters.courseId;
    if (filters.type) where.type = filters.type;
    return prisma.assessment.findMany({ where, include: { _count: { select: { assessmentQuestions: true } } } });
  }

  async recordAttempt(data: {
    studentId: string; questionId: string; selectedAnswer: string; correct: boolean;
    timeSpentSeconds: number; sessionId?: string; mode?: AttemptMode; mistakeId?: string;
  }) {
    return prisma.questionAttempt.create({
      data: {
        studentId: data.studentId, questionId: data.questionId,
        selectedAnswer: data.selectedAnswer, correct: data.correct,
        timeSpentSeconds: data.timeSpentSeconds, sessionId: data.sessionId,
        mode: data.mode, mistakeId: data.mistakeId, answeredAt: new Date(),
      },
    });
  }

  async listAttempts(studentId: string, limit = 100) {
    return prisma.questionAttempt.findMany({
      where: { studentId }, include: { question: true }, orderBy: { answeredAt: 'desc' }, take: limit,
    });
  }
}

export const assessmentService = new AssessmentService();
