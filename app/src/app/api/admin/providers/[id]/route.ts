/**
 * Single Provider API
 *
 * GET /api/admin/providers/[id]
 * Fetches details for a single provider.
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
