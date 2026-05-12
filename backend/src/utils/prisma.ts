import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

let prisma: PrismaClient;

export const getPrisma = (databaseUrl: string) => {
  if (prisma) return prisma;

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
  
  return prisma;
};

// Default export for backward compatibility, but in Workers we should use getPrisma(env.DATABASE_URL)
export default prisma!;
