/**
 * Setup Test Provider User
 *
 * Creates a test provider user with pending registration for manual testing.
 * This user is NOT cleaned up - it persists for browser testing.
 *
 * Run with: npx tsx scripts/setup-test-provider.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as crypto from "crypto";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TEST_EMAIL = "info@winelandskneeclinic.co.za";
const TEST_PASSWORD = "femur-MANURE7switches";

async function setupTestProvider() {
  console.log("=== Setting up Test Provider User ===\n");

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: TEST_EMAIL },
    });

    if (existingUser) {
      console.log(`User ${TEST_EMAIL} already exists.`);

      // Check for existing membership
      const member = await prisma.member.findFirst({
        where: { userId: existingUser.id },
        include: { organization: true },
      });

      if (member) {
        console.log(`  User is ${member.role} of ${member.organization.name} (${member.organization.status})`);
        console.log("\nNo setup needed - user is already configured.");
        return true;
      }

      // Check for pending registration
      const pending = await prisma.pendingProviderRegistration.findFirst({
        where: { userId: existingUser.id },
      });

      if (pending) {
        console.log(`  User has pending registration: ${pending.practiceName}`);
        console.log(`  Email verified: ${existingUser.emailVerified}`);

        if (!existingUser.emailVerified) {
          console.log("\nVerifying email...");
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { emailVerified: true },
          });
          console.log("  ✓ Email verified");
        }

        console.log("\nUser is ready. Log in via browser to complete registration.");
        return true;
      }

      // User exists but has no pending registration or organization
      console.log("  User has no pending registration or organization.");
      console.log("  Creating pending registration...");

      await prisma.pendingProviderRegistration.create({
        data: {
          userId: existingUser.id,
          practiceName: "Winelands Knee Clinic",
          practiceNumber: "0716170",
          phone: "+27792502890",
          industryType: "specialist",
          website: "https://winelandskneeclinic.co.za/",
          complexName: "Medical Centre",
          unitNumber: "Room 12",
          streetAddress: "62 Berlyn",
          suburb: "Lemoenkloof",
          city: "Paarl",
          province: "Western Cape",
          postalCode: "7646",
          country: "South Africa",
          address: "62 Berlyn",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // Ensure email is verified
      if (!existingUser.emailVerified) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { emailVerified: true },
        });
      }

      console.log("  ✓ Pending registration created");
      console.log("  ✓ Email verified");
      console.log("\nUser is ready. Log in via browser to complete registration.");
      return true;
    }

    // Create new user
    console.log("Creating new user...");
    const testUserId = crypto.randomBytes(16).toString("base64url");

    // Hash password using the same method as better-auth
    // Note: In real app, better-auth handles this, but for testing we create directly
    const passwordHash = crypto.createHash("sha256").update(TEST_PASSWORD).digest("hex");

    const testUser = await prisma.user.create({
      data: {
        id: testUserId,
        email: TEST_EMAIL,
        name: "Winelands Knee Clinic",
        emailVerified: true, // Pre-verified for testing
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`  ✓ Created user: ${testUser.email}`);
    console.log(`  ✓ User ID: ${testUser.id}`);

    // Create account for password login
    await prisma.account.create({
      data: {
        id: crypto.randomBytes(16).toString("base64url"),
        userId: testUserId,
        providerId: "credential",
        accountId: testUserId,
        password: passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log("  ✓ Created account for password login");

    // Create pending registration
    await prisma.pendingProviderRegistration.create({
      data: {
        userId: testUserId,
        practiceName: "Winelands Knee Clinic",
        practiceNumber: "0716170",
        phone: "+27792502890",
        industryType: "specialist",
        website: "https://winelandskneeclinic.co.za/",
        complexName: "Medical Centre",
        unitNumber: "Room 12",
        streetAddress: "62 Berlyn",
        suburb: "Lemoenkloof",
        city: "Paarl",
        province: "Western Cape",
        postalCode: "7646",
        country: "South Africa",
        address: "62 Berlyn",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    console.log("  ✓ Created pending registration");

    console.log("\n=== Setup Complete ===");
    console.log(`\nTest user created:`);
    console.log(`  Email: ${TEST_EMAIL}`);
    console.log(`  Password: ${TEST_PASSWORD}`);
    console.log(`\nTo test the registration flow:`);
    console.log(`1. Go to http://localhost:3000/login`);
    console.log(`2. Use the [DEV] Provider autofill button`);
    console.log(`3. Click Sign In`);
    console.log(`4. User should be redirected to /provider/pending`);
    console.log(`5. Page should auto-complete registration`);
    console.log(`6. Practice should appear in admin approval list`);

    return true;

  } catch (error) {
    console.error("Setup failed:", error);
    return false;
  }
}

async function main() {
  try {
    const success = await setupTestProvider();
    process.exit(success ? 0 : 1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
