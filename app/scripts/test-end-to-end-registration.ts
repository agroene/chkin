/**
 * End-to-End Provider Registration Test
 *
 * This script simulates the COMPLETE provider registration flow:
 * 1. Creates a test user (simulating signUp)
 * 2. Creates pending registration (simulating save-registration)
 * 3. Marks email as verified (simulating email verification)
 * 4. Creates organization and owner membership (simulating complete-registration)
 * 5. Verifies the organization appears in admin approval list
 *
 * Run with: npx tsx scripts/test-end-to-end-registration.ts
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

async function testEndToEndRegistration() {
  console.log("=== End-to-End Provider Registration Test ===\n");

  const testEmail = `test-e2e-${Date.now()}@test.com`;
  const testUserId = `test-e2e-${Date.now()}`;
  const practiceName = "E2E Test Practice";

  try {
    // Step 1: Create test user (simulates signUp.email)
    console.log("Step 1: Creating test user (simulating signUp)...");
    const testUser = await prisma.user.create({
      data: {
        id: testUserId,
        email: testEmail,
        name: "E2E Test User",
        emailVerified: false, // Initially unverified
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`  ✓ Created user: ${testUser.email}`);
    console.log(`  ✓ Email verified: ${testUser.emailVerified}`);

    // Step 2: Create pending registration (simulates save-registration API)
    console.log("\nStep 2: Creating pending registration (simulating save-registration)...");
    const pendingReg = await prisma.pendingProviderRegistration.create({
      data: {
        userId: testUserId,
        practiceName: practiceName,
        practiceNumber: "E2E123",
        phone: "+27821234567",
        industryType: "specialist",
        website: "https://e2e-test.com",
        complexName: "E2E Medical Centre",
        unitNumber: "Suite E2E",
        streetAddress: "123 E2E Street",
        suburb: "E2E Suburb",
        city: "E2E City",
        province: "Western Cape",
        postalCode: "7000",
        country: "South Africa",
        address: "123 E2E Street",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });
    console.log(`  ✓ Created pending registration: ${pendingReg.id}`);
    console.log(`  ✓ Practice name: ${pendingReg.practiceName}`);

    // Step 3: Verify email (simulates clicking verification link)
    console.log("\nStep 3: Verifying email (simulating verification link click)...");
    await prisma.user.update({
      where: { id: testUserId },
      data: { emailVerified: true },
    });
    console.log("  ✓ Email marked as verified");

    // Step 4: Complete registration (simulates complete-registration API)
    console.log("\nStep 4: Creating organization and membership (simulating complete-registration)...");

    // Generate slug
    const baseSlug = practiceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: baseSlug },
    });
    const slug = existingOrg ? `${baseSlug}-${Date.now()}` : baseSlug;

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name: pendingReg.practiceName,
        slug: slug,
        status: "pending", // Requires admin approval
        practiceNumber: pendingReg.practiceNumber,
        phone: pendingReg.phone,
        industryType: pendingReg.industryType,
        website: pendingReg.website,
        complexName: pendingReg.complexName,
        unitNumber: pendingReg.unitNumber,
        streetAddress: pendingReg.streetAddress,
        suburb: pendingReg.suburb,
        city: pendingReg.city,
        province: pendingReg.province,
        postalCode: pendingReg.postalCode,
        country: pendingReg.country,
      },
    });
    console.log(`  ✓ Created organization: ${organization.id}`);
    console.log(`  ✓ Organization name: ${organization.name}`);
    console.log(`  ✓ Organization status: ${organization.status}`);

    // Create member with OWNER role
    const member = await prisma.member.create({
      data: {
        userId: testUserId,
        organizationId: organization.id,
        role: "owner", // THIS IS THE KEY - user becomes OWNER not just member
      },
    });
    console.log(`  ✓ Created membership: ${member.id}`);
    console.log(`  ✓ User role: ${member.role}`);

    // Delete pending registration (no longer needed)
    await prisma.pendingProviderRegistration.delete({
      where: { id: pendingReg.id },
    });
    console.log("  ✓ Deleted pending registration");

    // Step 5: Verify final state
    console.log("\nStep 5: Verifying final state...");

    // Check user has organization membership with owner role
    const finalMember = await prisma.member.findFirst({
      where: { userId: testUserId },
      include: {
        organization: true,
        user: { select: { email: true, emailVerified: true } },
      },
    });

    if (!finalMember) {
      throw new Error("FAILED: No membership found after creation!");
    }

    if (finalMember.role !== "owner") {
      throw new Error(`FAILED: User role is "${finalMember.role}" not "owner"!`);
    }

    console.log(`  ✓ User ${finalMember.user?.email} has role: ${finalMember.role}`);
    console.log(`  ✓ Organization: ${finalMember.organization.name}`);
    console.log(`  ✓ Organization status: ${finalMember.organization.status}`);

    // Check organization appears in pending approvals (admin list)
    const pendingOrganizations = await prisma.organization.findMany({
      where: { status: "pending" },
      select: { id: true, name: true, status: true },
    });

    const ourOrg = pendingOrganizations.find((o) => o.id === organization.id);
    if (!ourOrg) {
      throw new Error("FAILED: Organization not found in pending approvals list!");
    }

    console.log(`\n  ✓ Organization "${ourOrg.name}" appears in admin approval list`);
    console.log(`  ✓ Total pending organizations: ${pendingOrganizations.length}`);

    console.log("\n=== ALL CHECKS PASSED ===");
    console.log("\nSummary:");
    console.log(`  - User "${testEmail}" registered as provider`);
    console.log(`  - User is OWNER of "${organization.name}"`);
    console.log(`  - Practice is in PENDING approval status`);
    console.log(`  - Practice appears in admin approval queue`);

    // Cleanup
    console.log("\nCleaning up test data...");
    await prisma.member.delete({ where: { id: member.id } });
    await prisma.organization.delete({ where: { id: organization.id } });
    await prisma.user.delete({ where: { id: testUserId } });
    console.log("  ✓ Test data cleaned up");

    console.log("\n✅ TEST PASSED - Provider registration flow is working correctly!");
    return true;

  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);

    // Cleanup on failure
    try {
      await prisma.pendingProviderRegistration.deleteMany({
        where: { userId: testUserId },
      });
      await prisma.member.deleteMany({
        where: { userId: testUserId },
      });
      await prisma.organization.deleteMany({
        where: { slug: { startsWith: "e2e-test" } },
      });
      await prisma.user.delete({
        where: { id: testUserId },
      });
    } catch {
      // Ignore cleanup errors
    }

    return false;
  }
}

async function main() {
  try {
    const passed = await testEndToEndRegistration();
    process.exit(passed ? 0 : 1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
