const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log(`Start seeding ...`);
  const hashedPassword = hashPassword('admin123');

  await prisma.user.upsert({
    where: { email: 'super@certipaws.com' },
    update: { password: hashedPassword },
    create: { email: 'super@certipaws.com', password: hashedPassword, role: 'SUPER_ADMIN' },
  });

  await prisma.user.upsert({
    where: { email: 'admin@certipaws.com' },
    update: { password: hashedPassword },
    create: { email: 'admin@certipaws.com', password: hashedPassword, role: 'GENERAL_ADMIN' },
  });

  await prisma.user.upsert({
    where: { email: 'somchai@certipaws.com' },
    update: { password: hashedPassword },
    create: {
      email: 'somchai@certipaws.com',
      password: hashedPassword,
      role: 'EMPLOYEE',
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

  console.log(`Seeding finished.`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
