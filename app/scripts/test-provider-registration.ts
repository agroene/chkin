/**
 * Test Script: Provider Registration Flow
 *
 * This script tests that the PendingProviderRegistration table
 * can be written to with all required fields including address fields.
 *
 * Run with: npx tsx scripts/test-provider-registration.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testPendingRegistration() {
  console.log("=== Testing Provider Registration Flow ===\n");

  // Test 1: Check that Prisma client has the complexName field
  console.log("Test 1: Checking Prisma client types...");

  // Create a test object with all fields
  const testData = {
    practiceName: "Test Practice",
    practiceNumber: "1234567",
    phone: "+27821234567",
    industryType: "specialist",
    website: "https://test.com",
    complexName: "Test Complex",  // This is the field that was failing
    unitNumber: "Unit 1",
    streetAddress: "123 Test Street",
    suburb: "Test Suburb",
    city: "Test City",
    province: "Test Province",
    postalCode: "1234",
    country: "South Africa",
    address: "123 Test Street", // Legacy field
  };

  // Test 2: Try to create a temporary user and pending registration
  console.log("Test 2: Creating test user and pending registration...");

  try {
    // Create a temporary test user
    const testUser = await prisma.user.create({
      data: {
        id: `test-user-${Date.now()}`,
        email: `test-${Date.now()}@test.com`,
        name: "Test User",
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`  ✓ Created test user: ${testUser.id}`);

    // Try to create pending registration with ALL fields including complexName
    const pendingReg = await prisma.pendingProviderRegistration.create({
      data: {
        userId: testUser.id,
        ...testData,
      },
    });
    console.log(`  ✓ Created pending registration: ${pendingReg.id}`);
    console.log(`  ✓ complexName saved: "${pendingReg.complexName}"`);
    console.log(`  ✓ unitNumber saved: "${pendingReg.unitNumber}"`);
    console.log(`  ✓ streetAddress saved: "${pendingReg.streetAddress}"`);
    console.log(`  ✓ suburb saved: "${pendingReg.suburb}"`);
    console.log(`  ✓ province saved: "${pendingReg.province}"`);

    // Clean up - delete the test data
    await prisma.pendingProviderRegistration.delete({
      where: { id: pendingReg.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    console.log("  ✓ Cleaned up test data");

    console.log("\n=== ALL TESTS PASSED ===");
    console.log("\nThe Prisma client is correctly configured with all address fields.");
    console.log("Provider registration should work correctly.\n");

    return true;
  } catch (error) {
    console.error("\n=== TEST FAILED ===");
    console.error("Error:", error);

    if (error instanceof Error && error.message.includes("complexName")) {
      console.error("\nThe Prisma client does NOT have the complexName field.");
      console.error("This means the client was not regenerated properly.\n");
      console.error("Fix: Run these commands:");
      console.error("  1. Stop the dev server");
      console.error("  2. Delete node_modules/.prisma");
      console.error("  3. Run: npx prisma generate");
      console.error("  4. Restart the dev server");
    }

    return false;
  }
}

// Test 3: Verify the upsert operation works (this is what the API uses)
async function testUpsertOperation() {
  console.log("\nTest 3: Testing upsert operation (used by save-registration API)...");

  try {
    // Create a temporary test user
    const testUser = await prisma.user.create({
      data: {
        id: `test-user-upsert-${Date.now()}`,
        email: `test-upsert-${Date.now()}@test.com`,
        name: "Test User Upsert",
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const testData = {
      practiceName: "Upsert Test Practice",
      practiceNumber: "7654321",
      phone: "+27829876543",
      industryType: "general_practice",
      website: "https://upsert-test.com",
      complexName: "Upsert Complex",
      unitNumber: "Suite 5",
      streetAddress: "456 Upsert Road",
      suburb: "Upsert Suburb",
      city: "Upsert City",
      province: "Upsert Province",
      postalCode: "5678",
      address: "456 Upsert Road",
    };

    // This is the exact operation used in save-registration/route.ts
    const result = await prisma.pendingProviderRegistration.upsert({
      where: { userId: testUser.id },
      update: testData,
      create: {
        userId: testUser.id,
        ...testData,
      },
    });

    console.log(`  ✓ Upsert succeeded: ${result.id}`);
    console.log(`  ✓ complexName: "${result.complexName}"`);

    // Clean up
    await prisma.pendingProviderRegistration.delete({
      where: { id: result.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    console.log("  ✓ Cleaned up test data");

    return true;
  } catch (error) {
    console.error("  ✗ Upsert FAILED:", error);
    return false;
  }
}

async function main() {
  try {
    const test1Passed = await testPendingRegistration();
    const test2Passed = await testUpsertOperation();

    if (test1Passed && test2Passed) {
      console.log("\n✓ All tests passed! Provider registration is ready.");
      process.exit(0);
    } else {
      console.log("\n✗ Some tests failed. See errors above.");
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
