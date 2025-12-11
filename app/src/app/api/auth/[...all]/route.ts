import { auth } from "@/lib/auth";

// Force dynamic rendering to prevent PrismaClient instantiation during build
export const dynamic = "force-dynamic";

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
