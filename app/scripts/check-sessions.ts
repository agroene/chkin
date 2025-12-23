import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const sessions = await prisma.session.findMany({
    include: { user: { select: { email: true } } }
  });

  console.log("=== Active Sessions ===");
  for (const s of sessions) {
    console.log("Session:", s.id.substring(0, 20) + "...", "| User:", s.user?.email, "| Expires:", s.expiresAt);
  }

  await prisma.$disconnect();
  await pool.end();
}
main();
