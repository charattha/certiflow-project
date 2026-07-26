import { PrismaClient, Role } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log(`Start seeding ...`);

  // SHA-256 hash for 'admin123'
  const hashedPassword = hashPassword('admin123');

  // Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'super@certiflow.com' },
    update: { password: hashedPassword },
    create: {
      email: 'super@certiflow.com',
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
    },
  });

  // General Admin
  const genAdmin = await prisma.user.upsert({
    where: { email: 'admin@certiflow.com' },
    update: { password: hashedPassword },
    create: {
      email: 'admin@certiflow.com',
      password: hashedPassword,
      role: Role.GENERAL_ADMIN,
    },
  });

  // Regular Employee (Somchai Jaidee)
  const employeeUser = await prisma.user.upsert({
    where: { email: 'somchai@certiflow.com' },
    update: { password: hashedPassword },
    create: {
      email: 'somchai@certiflow.com',
      password: hashedPassword,
      role: Role.EMPLOYEE,
      employee: {
        create: {
          employeeId: 'EMP-10293',
          firstName: 'Somchai',
          lastName: 'Jaidee',
          department: 'Engineering',
          position: 'Software Developer',
        },
      },
    },
  });

  console.log({ superAdmin, genAdmin, employeeUser });
  console.log(`Seeding finished.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
