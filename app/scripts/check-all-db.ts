/**
 * Check All Database Records
 *
 * Lists all users, pending registrations, organizations, and members.
 *
 * Run with: npx tsx scripts/check-all-db.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== All Users ===");
  const users = await prisma.user.findMany({
    select: { id: true, email: true, emailVerified: true, isSystemAdmin: true },
  });
  for (const u of users) {
    console.log(`  ${u.email} (verified: ${u.emailVerified}, admin: ${u.isSystemAdmin})`);
  }

  console.log("\n=== All Pending Registrations ===");
  const pending = await prisma.pendingProviderRegistration.findMany({
    select: { id: true, userId: true, practiceName: true },
  });
  if (pending.length === 0) {
    console.log("  (none)");
  } else {
    for (const p of pending) {
      console.log(`  ${p.practiceName} (userId: ${p.userId})`);
    }
  }

  console.log("\n=== All Organizations ===");
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, status: true },
  });
  if (orgs.length === 0) {
    console.log("  (none)");
  } else {
    for (const o of orgs) {
      console.log(`  ${o.name} (${o.status})`);
    }
  }

  console.log("\n=== All Members ===");
  const members = await prisma.member.findMany({
    include: {
      user: { select: { email: true } },
      organization: { select: { name: true } },
    },
  });
  if (members.length === 0) {
    console.log("  (none)");
  } else {
    for (const m of members) {
      console.log(`  ${m.user?.email} is ${m.role} of ${m.organization?.name}`);
    }
  }

  await prisma.$disconnect();
  await pool.end();
}

main();
