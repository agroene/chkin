/**
 * Provider Status API
 *
 * Returns the organization status for the authenticated user.
 * Used by ProviderGuard to determine access and redirects.
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
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find user's organization membership
    const membership = await prisma.member.findFirst({
      where: { userId: session.user.id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            status: true,
            slug: true,
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json({
        hasOrganization: false,
        status: null,
        organizationId: null,
        organizationName: null,
      });
    }

    return NextResponse.json({
      hasOrganization: true,
      status: membership.organization.status,
      organizationId: membership.organization.id,
      organizationName: membership.organization.name,
      organizationSlug: membership.organization.slug,
      role: membership.role,
    });
  } catch (error) {
    console.error("Provider status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
