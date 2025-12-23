import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Check user email verification status
  const user = await prisma.user.findFirst({
    where: { email: "info@winelandskneeclinic.co.za" }
  });
  console.log("Provider user emailVerified:", user?.emailVerified);

  // Verify the email
  await prisma.user.update({
    where: { email: "info@winelandskneeclinic.co.za" },
    data: { emailVerified: true }
  });
  console.log("Email now verified");

  await prisma.$disconnect();
  await pool.end();
}
main();
