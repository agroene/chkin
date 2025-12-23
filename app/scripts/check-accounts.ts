import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const accounts = await prisma.account.findMany({
    include: { user: { select: { email: true } } }
  });

  console.log("=== Accounts ===");
  for (const a of accounts) {
    console.log("User:", a.user?.email, "| Provider:", a.providerId, "| Has password:", !!a.password);
  }

  await prisma.$disconnect();
  await pool.end();
}
main();
