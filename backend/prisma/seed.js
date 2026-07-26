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
    where: { email: 'super@certiflow.com' },
    update: { password: hashedPassword },
    create: { email: 'super@certiflow.com', password: hashedPassword, role: 'SUPER_ADMIN' },
  });

  await prisma.user.upsert({
    where: { email: 'admin@certiflow.com' },
    update: { password: hashedPassword },
    create: { email: 'admin@certiflow.com', password: hashedPassword, role: 'GENERAL_ADMIN' },
  });

  await prisma.user.upsert({
    where: { email: 'somchai@certiflow.com' },
    update: { password: hashedPassword },
    create: {
      email: 'somchai@certiflow.com',
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
