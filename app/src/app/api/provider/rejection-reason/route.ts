/**
 * Provider Rejection Reason API
 *
 * Returns the rejection reason for a provider's organization.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = request.nextUrl.searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 }
      );
    }

    // Verify user is a member of this organization
    const membership = await prisma.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId: orgId,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the organization's rejection reason
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { rejectionReason: true },
    });

    return NextResponse.json({ reason: organization?.rejectionReason || null });
  } catch (error) {
    console.error("Rejection reason fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch rejection reason" },
      { status: 500 }
    );
  }
}
