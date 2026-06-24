import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://localhost:5432/multi_llm_arena";

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const userPassword = await bcrypt.hash("user123", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", password: adminPassword, role: "super_admin" },
  });

  await prisma.user.upsert({
    where: { username: "user" },
    update: {},
    create: { username: "user", password: userPassword, role: "user" },
  });

  console.log("✅ Seeded: admin/admin123, user/user123");
}

main().finally(() => prisma.$disconnect());
