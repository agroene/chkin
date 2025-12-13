/**
 * Admin Guard Utility
 *
 * Server-side utility to verify admin access for API routes.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  isSystemAdmin: boolean;
}

interface AdminGuardResult {
  authorized: boolean;
  user?: AdminUser;
  response?: NextResponse;
}

/**
 * Verify the current user is a system admin.
 * Returns the user if authorized, or an error response if not.
 */
export async function requireAdmin(): Promise<AdminGuardResult> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        ),
      };
    }

    // Fetch full user from database to get isSystemAdmin flag
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        isSystemAdmin: true,
      },
    });

    if (!user) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "User not found" },
          { status: 401 }
        ),
      };
    }

    if (!user.isSystemAdmin) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Forbidden - Admin access required" },
          { status: 403 }
        ),
      };
    }

    return {
      authorized: true,
      user,
    };
  } catch (error) {
    console.error("Admin guard error:", error);
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Authentication error" },
        { status: 500 }
      ),
    };
  }
}
