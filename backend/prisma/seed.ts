import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // Simple bcrypt mock password 'password123'
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'super@certipaws.com' },
    update: {},
    create: {
      email: 'super@certipaws.com',
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
    },
  });

  // General Admin
  const genAdmin = await prisma.user.upsert({
    where: { email: 'admin@certipaws.com' },
    update: {},
    create: {
      email: 'admin@certipaws.com',
      password: hashedPassword,
      role: Role.GENERAL_ADMIN,
    },
  });

  // Regular Employee (Somchai Jaidee)
  const employeeUser = await prisma.user.upsert({
    where: { email: 'somchai@certipaws.com' },
    update: {},
    create: {
      email: 'somchai@certipaws.com',
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
