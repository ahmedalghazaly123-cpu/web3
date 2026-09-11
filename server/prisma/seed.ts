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
  console.log('Seed complete');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
