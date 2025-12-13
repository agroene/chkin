/**
 * Better Auth Client
 *
 * Client-side authentication utilities for use in React components.
 * Provides hooks and functions for login, logout, and session management.
 *
 * @module lib/auth-client
 */

import { createAuthClient } from "better-auth/react";
import { organizationClient, inferAdditionalFields } from "better-auth/client/plugins";

const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    organizationClient(),
    inferAdditionalFields({
      user: {
        isSystemAdmin: {
          type: "boolean",
          required: false,
        },
      },
    }),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  organization,
  useActiveOrganization,
  useListOrganizations,
  sendVerificationEmail,
} = authClient;
