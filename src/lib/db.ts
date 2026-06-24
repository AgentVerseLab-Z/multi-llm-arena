import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// pg is CommonJS, handle both possible import shapes
import pgModule from "pg";
const PgPool = pgModule.Pool || (pgModule as any).default?.Pool;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient; pgPool: any };

function createPrisma() {
  const pool = new PgPool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return { prisma: new PrismaClient({ adapter }), pool };
}

if (!globalForPrisma.prisma) {
  const { prisma, pool } = createPrisma();
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pool;
}

export const prisma = globalForPrisma.prisma;
