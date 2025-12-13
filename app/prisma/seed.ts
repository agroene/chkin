/**
 * Prisma Seed Script
 *
 * Seeds the database with initial admin user and standard field library.
 * Run with: npm run seed
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";
import "dotenv/config";

// Initialize Prisma with PostgreSQL adapter (same as db.ts)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting database seed...");

  // Create initial system admin user
  const adminEmail = "admin@chkin.co.za";
  const adminPassword = "Admin@Chkin123!";

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    // Ensure existing admin has emailVerified set to true
    if (!existingAdmin.emailVerified || !existingAdmin.isSystemAdmin) {
      await prisma.user.update({
        where: { email: adminEmail },
        data: {
          emailVerified: true,
          isSystemAdmin: true,
        },
      });
      console.log(`✓ Updated system admin user: ${adminEmail} (emailVerified: true)`);
    } else {
      console.log(`✓ System admin user already exists and is verified: ${adminEmail}`);
    }
  } else {
    // Hash password using Better Auth's hashing function
    const hashedPassword = await hashPassword(adminPassword);

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: "System Admin",
        emailVerified: true,
        isSystemAdmin: true,
        accounts: {
          create: {
            accountId: adminEmail,
            providerId: "credential",
            password: hashedPassword,
          },
        },
      },
    });

    console.log(`✓ Created system admin user: ${admin.email}`);
    console.log(`  Default password: ${adminPassword}`);
    console.log(`  ⚠️  Change this password immediately in production!`);
  }

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
