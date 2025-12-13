/**
 * Reject Provider API
 *
 * POST /api/admin/providers/[id]/reject
 * Body: { reason: string }
 * Rejects a pending provider registration with a reason.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin access
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    if (organization.status === "rejected") {
      return NextResponse.json(
        { error: "Provider is already rejected" },
        { status: 400 }
      );
    }

    // Update organization status to rejected
    const updatedOrganization = await prisma.organization.update({
      where: { id },
      data: {
        status: "rejected",
        rejectionReason: reason.trim(),
        approvedAt: null,
        approvedBy: null,
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: adminCheck.user!.id,
        organizationId: id,
        action: "REJECT_PROVIDER",
        resourceType: "Organization",
        resourceId: id,
        metadata: JSON.stringify({
          providerName: organization.name,
          previousStatus: organization.status,
          rejectionReason: reason.trim(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedOrganization.id,
        name: updatedOrganization.name,
        status: updatedOrganization.status,
        rejectionReason: updatedOrganization.rejectionReason,
      },
    });
  } catch (error) {
    console.error("Reject provider error:", error);
    return NextResponse.json(
      { error: "Failed to reject provider" },
      { status: 500 }
    );
  }
}
