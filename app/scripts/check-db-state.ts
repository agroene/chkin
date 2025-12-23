/**
 * Check Database State Script
 *
 * Checks the current state of the test user in the database.
 *
 * Run with: npx tsx scripts/check-db-state.ts
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
  const testEmail = "info@winelandskneeclinic.co.za";
  console.log(`=== Checking Database State for ${testEmail} ===\n`);

  try {
    // Find the test user
    const user = await prisma.user.findFirst({
      where: { email: testEmail },
    });

    if (!user) {
      console.log("User NOT FOUND in database");
      return;
    }

    console.log("1. User:");
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Email Verified: ${user.emailVerified}`);
    console.log(`   Created At: ${user.createdAt}`);

    // Check for pending registration
    const pending = await prisma.pendingProviderRegistration.findFirst({
      where: { userId: user.id },
    });

    console.log("\n2. Pending Registration:");
    if (pending) {
      console.log(`   ID: ${pending.id}`);
      console.log(`   Practice Name: ${pending.practiceName}`);
      console.log(`   Expires At: ${pending.expiresAt}`);
      console.log(`   Is Expired: ${new Date() > pending.expiresAt}`);
    } else {
      console.log("   NOT FOUND");
    }

    // Check for organization membership
    const member = await prisma.member.findFirst({
      where: { userId: user.id },
      include: { organization: true },
    });

    console.log("\n3. Organization Membership:");
    if (member) {
      console.log(`   Role: ${member.role}`);
      console.log(`   Organization ID: ${member.organizationId}`);
      console.log(`   Organization Name: ${member.organization.name}`);
      console.log(`   Organization Status: ${member.organization.status}`);
    } else {
      console.log("   NOT FOUND");
    }

    console.log("\n=== Summary ===");
    if (!user.emailVerified) {
      console.log("❌ User email is NOT verified - organization cannot be created");
    } else if (pending && !member) {
      console.log("⏳ User is verified, has pending registration, but no organization yet");
      console.log("   The /provider/pending page should complete the registration");
    } else if (member) {
      console.log(`✅ User has organization: ${member.organization.name} (${member.organization.status})`);
      console.log(`   User role: ${member.role}`);
    } else {
      console.log("❌ No pending registration and no organization - user needs to register again");
    }

  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
