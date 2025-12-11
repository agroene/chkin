/**
 * Authentication Module
 *
 * Configures Better Auth for Chkin with:
 * - Email/password authentication
 * - Multi-tenancy via organizations (practices)
 * - Role-based access control
 *
 * @module lib/auth
 */

import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { prisma } from "./db";

// Re-export prisma for backwards compatibility
export { prisma } from "./db";

// Configuration constants
const MIN_PASSWORD_LENGTH = Number(process.env.MIN_PASSWORD_LENGTH) || 12;
const SESSION_EXPIRY_DAYS = 30;
const SESSION_UPDATE_DAYS = 1;
const SESSION_ABSOLUTE_EXPIRY_DAYS = 365;

/**
 * Better Auth Configuration
 *
 * POPIA Compliance Features:
 * - All sensitive operations logged to AuditLog table
 * - User consent and data access tracked
 * - Session management with IP/user agent tracking
 */
export const auth = betterAuth({
  // Authentication secret - REQUIRED in production
  secret: process.env.BETTER_AUTH_SECRET,

  // Database configuration
  database: {
    db: prisma,
    type: "prisma",
  },

  // Email/password authentication
  emailAndPassword: {
    enabled: true,
    minPasswordLength: MIN_PASSWORD_LENGTH,
  },

  // Multi-tenancy via organizations (practices)
  plugins: [
    organization({
      // Only platform admins create organizations
      // Practice admins manage their own members
      allowUserToCreateOrganization: false,
    }),
  ],

  // Application identity
  appName: "Chkin",
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ],

  // Session configuration (production settings)
  ...(process.env.NODE_ENV === "production" && {
    session: {
      expiresIn: 60 * 60 * 24 * SESSION_EXPIRY_DAYS,
      updateAgeSession: 60 * 60 * 24 * SESSION_UPDATE_DAYS,
      absoluteExpirationTime: 60 * 60 * 24 * SESSION_ABSOLUTE_EXPIRY_DAYS,
    },
  }),
});

// Type exports for use across the application
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
