/**
 * Authentication Module
 *
 * Configures Better Auth for Chkin with:
 * - Email/password authentication with email verification
 * - Multi-tenancy via organizations (practices)
 * - Role-based access control
 *
 * @module lib/auth
 */

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import { Resend } from "resend";
import { prisma } from "./db";

// Re-export prisma for backwards compatibility
export { prisma } from "./db";

// Configuration constants
const MIN_PASSWORD_LENGTH = Number(process.env.MIN_PASSWORD_LENGTH) || 12;
const SESSION_EXPIRY_DAYS = 30;
const SESSION_UPDATE_DAYS = 1;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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

  // Database configuration using Prisma adapter
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Include custom user fields in session
  user: {
    additionalFields: {
      isSystemAdmin: {
        type: "boolean",
        defaultValue: false,
        input: false, // Cannot be set during signup
      },
    },
  },

  // Email/password authentication
  emailAndPassword: {
    enabled: true,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    requireEmailVerification: true,
    autoSignIn: false, // Don't auto-sign in after registration, require verification
  },

  // Email verification configuration
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // Initialize Resend client
      const resend = new Resend(process.env.RESEND_API_KEY);

      try {
        // Send verification email using Resend
        await resend.emails.send({
          from: process.env.EMAIL_FROM || "noreply@chkin.co.za",
          to: user.email,
          subject: "Verify your Chkin account",
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #0d9488; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">Chkin</h1>
                  <p style="color: #ccfbf1; margin: 10px 0 0 0;">Share your info. Own your consent.</p>
                </div>

                <div style="background-color: #f9fafb; padding: 40px 30px; border-radius: 0 0 8px 8px;">
                  <h2 style="color: #111827; margin-top: 0;">Verify Your Email Address</h2>

                  <p style="color: #4b5563; font-size: 16px;">
                    Thank you for registering with Chkin. To complete your registration and access your account, please verify your email address.
                  </p>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${url}"
                       style="display: inline-block; background-color: #0d9488; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Verify Email Address
                    </a>
                  </div>

                  <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                    If the button above doesn't work, copy and paste this link into your browser:
                  </p>
                  <p style="color: #0d9488; font-size: 14px; word-break: break-all;">
                    ${url}
                  </p>

                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    If you didn't create an account with Chkin, you can safely ignore this email.
                  </p>
                </div>
              </body>
            </html>
          `,
        });

        console.log(`[Resend] Verification email sent to ${user.email}`);
      } catch (error) {
        console.error(`[Resend] Failed to send verification email to ${user.email}:`, error);
        // In development, log the URL as fallback
        if (process.env.NODE_ENV === "development") {
          console.log(`[DEV FALLBACK] Verification URL: ${url}`);
        }
        throw error;
      }
    },
  },

  // Multi-tenancy via organizations (practices)
  plugins: [
    organization({
      // Allow users to create organizations (for provider registration)
      allowUserToCreateOrganization: true,
    }),
  ],

  // Application identity
  appName: "Chkin",
  baseURL: APP_URL,
  trustedOrigins: [APP_URL],

  // Session configuration (production settings)
  ...(process.env.NODE_ENV === "production" && {
    session: {
      expiresIn: 60 * 60 * 24 * SESSION_EXPIRY_DAYS,
      updateAge: 60 * 60 * 24 * SESSION_UPDATE_DAYS,
    },
  }),
});

// Type exports for use across the application
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
