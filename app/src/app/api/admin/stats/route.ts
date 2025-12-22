/**
 * Admin Stats API
 *
 * GET /api/admin/stats
 * Returns dashboard statistics for the admin panel.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  // Verify admin access
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    // Get counts in parallel for efficiency
    const [
      totalUsers,
      activeProviders,
      pendingApprovals,
      totalSubmissions,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),

      // Active providers (approved organizations)
      prisma.organization.count({
        where: { status: "approved" },
      }),

      // Pending approvals
      prisma.organization.count({
        where: { status: "pending" },
      }),

      // Total form submissions
      prisma.submission.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        activeProviders,
        pendingApprovals,
        totalSubmissions,
      },
    });
  } catch (error) {
    console.error("Get admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
