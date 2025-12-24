/**
 * Single Provider API
 *
 * GET /api/admin/providers/[id]
 * Fetches details for a single provider.
 *
 * DELETE /api/admin/providers/[id]?deleteUsers=true|false
 * Deletes a provider organization and optionally its associated users.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export async function GET(
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

    const provider = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: { members: true },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                emailVerified: true,
                createdAt: true,
              },
            },
          },
        },
        formTemplates: {
          select: {
            id: true,
            title: true,
            description: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            // Consent configuration
            defaultConsentDuration: true,
            minConsentDuration: true,
            maxConsentDuration: true,
            allowAutoRenewal: true,
            gracePeriodDays: true,
            _count: {
              select: {
                submissions: true,
                fields: true,
                qrCodes: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    // Transform response
    const transformedProvider = {
      id: provider.id,
      name: provider.name,
      slug: provider.slug,
      status: provider.status,
      practiceNumber: provider.practiceNumber,
      phone: provider.phone,
      industryType: provider.industryType,
      address: provider.address,
      city: provider.city,
      postalCode: provider.postalCode,
      website: provider.website,
      rejectionReason: provider.rejectionReason,
      approvedAt: provider.approvedAt,
      approvedBy: provider.approvedBy,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
      memberCount: provider._count.members,
      members: provider.members.map((m) => ({
        id: m.id,
        role: m.role,
        createdAt: m.createdAt,
        user: m.user,
      })),
      formTemplates: provider.formTemplates.map((f) => ({
        id: f.id,
        title: f.title,
        description: f.description,
        isActive: f.isActive,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        // Consent configuration
        consentConfig: {
          defaultDuration: f.defaultConsentDuration,
          minDuration: f.minConsentDuration,
          maxDuration: f.maxConsentDuration,
          allowAutoRenewal: f.allowAutoRenewal,
          gracePeriodDays: f.gracePeriodDays,
        },
        _count: f._count,
      })),
    };

    return NextResponse.json({
      success: true,
      data: transformedProvider,
    });
  } catch (error) {
    console.error("Get provider error:", error);
    return NextResponse.json(
      { error: "Failed to fetch provider" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/providers/[id]
 * Deletes a provider organization.
 *
 * Query params:
 * - deleteUsers: "true" to also delete associated users, "false" to only remove memberships
 */
export async function DELETE(
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
    const { searchParams } = new URL(request.url);
    const deleteUsers = searchParams.get("deleteUsers") === "true";

    // Fetch organization with members
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                isSystemAdmin: true,
              },
            },
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    // Get user IDs (excluding system admins - they should never be deleted this way)
    const userIds = organization.members
      .filter((m) => !m.user.isSystemAdmin)
      .map((m) => m.user.id);

    // Start transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Delete all submissions associated with this organization (must delete before forms due to FK)
      await tx.submission.deleteMany({
        where: { organizationId: id },
      });

      // Delete all form templates associated with this organization
      await tx.formTemplate.deleteMany({
        where: { organizationId: id },
      });

      // Delete all members of this organization
      await tx.member.deleteMany({
        where: { organizationId: id },
      });

      // Delete the organization
      await tx.organization.delete({
        where: { id },
      });

      // If deleteUsers is true, delete the associated users
      if (deleteUsers && userIds.length > 0) {
        // Delete sessions for these users
        await tx.session.deleteMany({
          where: { userId: { in: userIds } },
        });

        // Delete accounts for these users
        await tx.account.deleteMany({
          where: { userId: { in: userIds } },
        });

        // Delete any pending registrations for these users
        await tx.pendingProviderRegistration.deleteMany({
          where: { userId: { in: userIds } },
        });

        // Delete the users
        await tx.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: deleteUsers
        ? `Organization "${organization.name}" and ${userIds.length} associated user(s) deleted`
        : `Organization "${organization.name}" deleted (users retained)`,
      deletedUserCount: deleteUsers ? userIds.length : 0,
    });
  } catch (error) {
    console.error("Delete provider error:", error);
    return NextResponse.json(
      { error: "Failed to delete provider" },
      { status: 500 }
    );
  }
}
