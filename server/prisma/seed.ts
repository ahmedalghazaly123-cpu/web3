import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seed() {
  const passwordHash = await bcrypt.hash('learnpilot', 10);
  const users = [
    { email: 'student@learnpilot.dev', passwordHash, name: 'Ahmed Hassan', role: 'STUDENT' },
    { email: 'teacher@learnpilot.dev', passwordHash, name: 'Sara Mahmoud', role: 'TEACHER' },
    { email: 'admin@learnpilot.dev', passwordHash, name: 'Omar Khaled', role: 'ADMIN' },
    { email: 'owner@learnpilot.dev', passwordHash, name: 'Layla Ibrahim', role: 'OWNER' },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: u,
    });
  }

  const teacher = await prisma.user.findUnique({ where: { email: 'teacher@learnpilot.dev' } });
  if (teacher) {
    const course = await prisma.course.upsert({
      where: { id: 'seed-course-calculus-1' },
      update: {},
      create: {
        id: 'seed-course-calculus-1',
        title: 'Calculus I',
        titleAr: 'حساب التفاضل',
        description: 'Limits, derivatives, and integrals.',
        descriptionAr: 'الحدود والمشتقات والintegrals.',
        instructorId: teacher.id,
        instructorName: 'Sara Mahmoud',
        instructorNameAr: 'سارة محمود',
        instructorAvatar: '',
        category: 'mathematics',
        categoryAr: 'رياضيات',
        cover: '',
        color: '#3b82f6',
        durationMinutes: 480,
        totalLessons: 12,
        published: true,
      },
    });

    const module1 = await prisma.module.upsert({
      where: { id: 'seed-module-limits' },
      update: {},
      create: { id: 'seed-module-limits', courseId: course.id, title: 'Limits', titleAr: 'الحدود', order: 1 },
    });

    await prisma.module.upsert({
      where: { id: 'seed-module-derivatives' },
      update: {},
      create: { id: 'seed-module-derivatives', courseId: course.id, title: 'Derivatives', titleAr: 'مشتقات', order: 2 },
    });

    await prisma.lesson.upsert({
      where: { id: 'seed-lesson-limits-intro' },
      update: {},
      create: {
        id: 'seed-lesson-limits-intro',
        moduleId: module1.id,
        courseId: course.id,
        title: 'Introduction to Limits',
        titleAr: 'مقدمة في الحدود',
        description: 'Understand what a limit is and how to compute basic limits.',
        type: 'VIDEO',
        durationMinutes: 25,
        order: 1,
        content: 'A limit describes the value a function approaches as the input approaches a point. For continuous functions, direct substitution works. If substitution yields the indeterminate form zero over zero, factor and cancel, then substitute again. One-sided limits approach from the left or the right; the two-sided limit exists only when both one-sided limits agree. Example: the limit of (x^2 - 1)/(x - 1) as x approaches 1 equals 2, found by factoring into (x-1)(x+1) and cancelling.',
      },
    });

    await prisma.lesson.upsert({
      where: { id: 'seed-lesson-deriv-power' },
      update: {},
      create: {
        id: 'seed-lesson-deriv-power',
        moduleId: 'seed-module-derivatives',
        courseId: course.id,
        title: 'Derivatives and the Power Rule',
        titleAr: 'المشتقات وقاعدة القوة',
        description: 'Instantaneous rate of change and the power rule.',
        type: 'VIDEO',
        durationMinutes: 30,
        order: 1,
        content: 'The derivative measures the instantaneous rate of change of a function. The power rule states d/dx of x^n equals n times x to the power n minus 1, valid for any real exponent. The derivative of a constant is zero. The sum rule allows differentiating term by term. The product rule combines two functions. The chain rule handles composition of functions. For example, the derivative of x cubed is three x squared, and the derivative of sin x is cos x.',
      },
    });

    const student = await prisma.user.findUnique({ where: { email: 'student@learnpilot.dev' } });
    if (student) {
      await prisma.enrollment.upsert({
        where: { id: 'seed-enrollment-1' },
        update: {},
        create: { id: 'seed-enrollment-1', studentId: student.id, courseId: course.id, status: 'ACTIVE', startedAt: new Date() },
      });
    }
  }

  console.log('Seed complete');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
