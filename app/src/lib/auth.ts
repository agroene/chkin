import { betterAuth } from "better-auth";
import { PrismaClient } from "@prisma/client";
import { organization } from "better-auth/plugins";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Singleton pattern for PrismaClient
// Prevents multiple instances in development hot reload
declare global {
  // eslint-disable-next-line no-var
  var prismaClient: PrismaClient;
}

let prismaClientInstance: PrismaClient | undefined;

export function getPrismaClient() {
  if (global.prismaClient) {
    return global.prismaClient;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  const client = new PrismaClient({
    adapter: new PrismaPg(pool),
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    global.prismaClient = client;
  }

  return client;
}

// Lazy initialization - only create when first accessed
export const prisma = new Proxy({} as PrismaClient, {
  get: (target, prop) => {
    if (!prismaClientInstance) {
      prismaClientInstance = getPrismaClient();
    }
    return (prismaClientInstance as any)[prop];
  },
}) as PrismaClient;

/**
 * Chkin Authentication Configuration
 *
 * Better Auth is configured with:
 * - Email/password authentication
 * - Database storage with PostgreSQL
 * - Organization plugin for multi-tenancy (practices)
 * - Role-based access control via member roles
 *
 * POPIA Compliance:
 * - All sensitive operations logged to AuditLog table
 * - User consent and data access tracked
 * - Session management with IP/user agent tracking
 */
export const auth = betterAuth({
  database: {
    db: prisma,
    type: "prisma",
  },
  emailAndPassword: {
    enabled: true,
    // Password requirements for POPIA compliance
    minPasswordLength: 12,
  },
  // Enable organization plugin for multi-tenant (practice-based) access
  plugins: [
    organization({
      // Only platform admins create organizations (practices)
      // Practice admins manage their own members
      allowUserToCreateOrganization: false,
    }),
  ],
  appName: "Chkin",
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ],
  // Advanced options for production
  ...(process.env.NODE_ENV === "production" && {
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAgeSession: 60 * 60 * 24, // Update session age every 24 hours
      absoluteExpirationTime: 60 * 60 * 24 * 365, // Absolute expiry 365 days
    },
  }),
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
