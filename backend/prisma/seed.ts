import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('Start seeding ...');

  const hashedPassword = hashPassword('admin123');

  const superAdmin = await prisma.user.upsert({
    where: { email: 'super@certipaws.com' },
    update: { password: hashedPassword },
    create: {
      email: 'super@certipaws.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      must_change_password: false,
    },
  });

  const genAdmin = await prisma.user.upsert({
    where: { email: 'admin@certipaws.com' },
    update: { password: hashedPassword },
    create: {
      email: 'admin@certipaws.com',
      password: hashedPassword,
      role: 'GENERAL_ADMIN',
      must_change_password: false,
    },
  });

  const employeeUser = await prisma.user.upsert({
    where: { email: 'somchai@certipaws.com' },
    update: { password: hashedPassword },
    create: {
      email: 'somchai@certipaws.com',
      password: hashedPassword,
      role: 'EMPLOYEE',
      must_change_password: false,
      employee: {
        create: {
          employee_id: 'EMP-10293',
          first_name: 'Somchai',
          last_name: 'Jaidee',
          department: 'Engineering',
          position: 'Software Developer',
        },
      },
    },
  });

  console.log({ superAdmin, genAdmin, employeeUser });
  console.log('Seeding finished.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
