/**
 * Approve Provider API
 *
 * POST /api/admin/providers/[id]/approve
 * Approves a pending provider registration.
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

    if (organization.status === "approved") {
      return NextResponse.json(
        { error: "Provider is already approved" },
        { status: 400 }
      );
    }

    // Update organization status to approved
    const updatedOrganization = await prisma.organization.update({
      where: { id },
      data: {
        status: "approved",
        approvedAt: new Date(),
        approvedBy: adminCheck.user!.id,
        rejectionReason: null, // Clear any previous rejection reason
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: adminCheck.user!.id,
        organizationId: id,
        action: "APPROVE_PROVIDER",
        resourceType: "Organization",
        resourceId: id,
        metadata: JSON.stringify({
          providerName: organization.name,
          previousStatus: organization.status,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedOrganization.id,
        name: updatedOrganization.name,
        status: updatedOrganization.status,
        approvedAt: updatedOrganization.approvedAt,
      },
    });
  } catch (error) {
    console.error("Approve provider error:", error);
    return NextResponse.json(
      { error: "Failed to approve provider" },
      { status: 500 }
    );
  }
}
