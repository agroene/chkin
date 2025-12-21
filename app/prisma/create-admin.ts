/**
 * Create admin user script
 * Uses Better Auth's hashPassword for proper password hashing
 */

import "dotenv/config";
import { prisma } from "../src/lib/db";
import { hashPassword } from "better-auth/crypto";

async function main() {
  const email = "admin@chkin.co.za";
  const password = "Admin@Chkin123!";

  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log("Admin user already exists, updating...");

    // Hash password using Better Auth's function
    const hashedPassword = await hashPassword(password);

    await prisma.user.update({
      where: { email },
      data: {
        emailVerified: true,
        isSystemAdmin: true,
      },
    });

    // Check if account exists
    const existingAccount = await prisma.account.findFirst({
      where: { userId: existing.id, providerId: "credential" },
    });

    if (existingAccount) {
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: {
          password: hashedPassword,
          accountId: email, // Better Auth uses email as accountId
        },
      });
    } else {
      await prisma.account.create({
        data: {
          userId: existing.id,
          accountId: email, // Better Auth uses email as accountId
          providerId: "credential",
          password: hashedPassword,
        },
      });
    }

    console.log("Admin user updated successfully with password");
    return;
  }

  // Hash password using Better Auth's function
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      name: "System Admin",
      emailVerified: true,
      isSystemAdmin: true,
    },
  });

  // Create account with password
  await prisma.account.create({
    data: {
      userId: user.id,
      accountId: email, // Better Auth uses email as accountId
      providerId: "credential",
      password: hashedPassword,
    },
  });

  console.log("Admin user created successfully:");
  console.log("Email:", email);
  console.log("User ID:", user.id);
  console.log("isSystemAdmin:", user.isSystemAdmin);
  console.log("emailVerified:", user.emailVerified);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
