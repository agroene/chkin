/**
 * Test Script: Full API Flow Test
 *
 * This simulates what happens when a user registers:
 * 1. User is created (simulating signUp.email)
 * 2. save-registration is called with all fields
 * 3. Verify the data was saved correctly
 *
 * Run with: npx tsx scripts/test-api-flow.ts
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

const API_BASE = "http://localhost:3000";

async function testFullFlow() {
  console.log("=== Testing Full Provider Registration API Flow ===\n");

  const testEmail = `test-api-${Date.now()}@test.com`;
  const testUserId = `test-api-user-${Date.now()}`;

  try {
    // Step 1: Create a test user in the database (simulates signUp.email)
    console.log("Step 1: Creating test user...");
    const testUser = await prisma.user.create({
      data: {
        id: testUserId,
        email: testEmail,
        name: "API Test User",
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`  ✓ Created user: ${testUser.email}`);

    // Step 2: Call save-registration API
    console.log("\nStep 2: Calling save-registration API...");
    const registrationData = {
      email: testEmail,
      practiceName: "API Test Practice",
      practiceNumber: "API123",
      phone: "+27821234567",
      industryType: "specialist",
      complexName: "API Test Complex",  // Key field that was failing
      unitNumber: "Suite API",
      address: "123 API Street",
      suburb: "API Suburb",
      city: "API City",
      province: "API Province",
      postalCode: "1234",
      website: "https://api-test.com",
    };

    const response = await fetch(`${API_BASE}/api/provider/save-registration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registrationData),
    });

    const result = await response.json();
    console.log(`  Response status: ${response.status}`);
    console.log(`  Response body: ${JSON.stringify(result)}`);

    if (!response.ok) {
      throw new Error(`API failed: ${result.error || "Unknown error"}`);
    }

    console.log("  ✓ save-registration API succeeded");

    // Step 3: Verify the data was saved correctly
    console.log("\nStep 3: Verifying saved data...");
    const savedReg = await prisma.pendingProviderRegistration.findUnique({
      where: { userId: testUserId },
    });

    if (!savedReg) {
      throw new Error("Pending registration was not found in database");
    }

    console.log(`  ✓ Found pending registration: ${savedReg.id}`);
    console.log(`  ✓ practiceName: "${savedReg.practiceName}"`);
    console.log(`  ✓ complexName: "${savedReg.complexName}"`);
    console.log(`  ✓ unitNumber: "${savedReg.unitNumber}"`);
    console.log(`  ✓ streetAddress: "${savedReg.streetAddress}"`);
    console.log(`  ✓ suburb: "${savedReg.suburb}"`);
    console.log(`  ✓ province: "${savedReg.province}"`);

    // Verify all fields match
    if (savedReg.complexName !== registrationData.complexName) {
      throw new Error(`complexName mismatch: expected "${registrationData.complexName}", got "${savedReg.complexName}"`);
    }
    if (savedReg.unitNumber !== registrationData.unitNumber) {
      throw new Error(`unitNumber mismatch: expected "${registrationData.unitNumber}", got "${savedReg.unitNumber}"`);
    }

    console.log("\n=== ALL FIELDS VERIFIED SUCCESSFULLY ===");

    // Cleanup
    console.log("\nCleaning up...");
    await prisma.pendingProviderRegistration.delete({
      where: { id: savedReg.id },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
    console.log("  ✓ Cleaned up test data");

    console.log("\n✓ FULL API FLOW TEST PASSED!");
    console.log("Provider registration is working correctly.\n");
    return true;

  } catch (error) {
    console.error("\n✗ TEST FAILED:", error);

    // Cleanup on failure
    try {
      await prisma.pendingProviderRegistration.deleteMany({
        where: { userId: testUserId },
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
    const passed = await testFullFlow();
    process.exit(passed ? 0 : 1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
