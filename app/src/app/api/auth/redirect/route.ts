/**
 * Auth Redirect API
 *
 * Returns the appropriate redirect path based on user's role and organization status.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ redirect: "/login" });
    }

    // Check if user is a system admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSystemAdmin: true },
    });

    // Check if user has any organization memberships (provider)
    const membership = await prisma.member.findFirst({
      where: { userId: session.user.id },
      include: {
        organization: {
          select: {
            status: true,
          },
        },
      },
    });

    // System admins go directly to admin portal
    if (user?.isSystemAdmin) {
      return NextResponse.json({ redirect: "/admin", isAdmin: true });
    }

    // Provider redirect logic
    if (membership) {
      const orgStatus = membership.organization.status;

      if (orgStatus === "pending") {
        return NextResponse.json({ redirect: "/provider/pending" });
      }

      if (orgStatus === "rejected") {
        return NextResponse.json({ redirect: "/provider/rejected" });
      }

      if (orgStatus === "approved") {
        return NextResponse.json({ redirect: "/provider" });
      }
    }

    // Check for pending provider registration (needs to complete org setup)
    const pendingRegistration = await prisma.pendingProviderRegistration.findUnique({
      where: { userId: session.user.id },
    });

    if (pendingRegistration) {
      // User has pending provider registration - send to pending page to complete setup
      return NextResponse.json({ redirect: "/provider/pending" });
    }

    // Default: regular user goes to patient portal
    return NextResponse.json({ redirect: "/patient" });
  } catch (error) {
    console.error("Auth redirect error:", error);
    return NextResponse.json({ redirect: "/patient" });
  }
}
