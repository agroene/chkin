/**
 * Provider Stats API
 *
 * Returns dashboard statistics for the authenticated provider's organization.
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

    // Find user's organization
    const membership = await prisma.member.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const organizationId = membership.organizationId;

    // Get form counts
    const [totalForms, activeForms] = await Promise.all([
      prisma.formTemplate.count({
        where: { organizationId },
      }),
      prisma.formTemplate.count({
        where: { organizationId, isActive: true },
      }),
    ]);

    // Get submission counts
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalSubmissions, pendingSubmissions, todaySubmissions] = await Promise.all([
      prisma.submission.count({
        where: {
          formTemplate: { organizationId },
        },
      }),
      prisma.submission.count({
        where: {
          formTemplate: { organizationId },
          status: "pending",
        },
      }),
      prisma.submission.count({
        where: {
          formTemplate: { organizationId },
          createdAt: { gte: today },
        },
      }),
    ]);

    return NextResponse.json({
      totalForms,
      activeForms,
      totalSubmissions,
      pendingSubmissions,
      todaySubmissions,
    });
  } catch (error) {
    console.error("Provider stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
