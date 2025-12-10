import { auth } from "@/lib/auth";

/**
 * Better Auth API Route Handler
 *
 * This route handles all authentication requests:
 * - User registration and login
 * - Session management
 * - OAuth provider flows
 * - Email verification
 * - Password reset
 *
 * All requests are routed through Better Auth middleware
 */
export const POST = auth.handler;
export const GET = auth.handler;
