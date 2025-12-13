/**
 * Admin Providers API
 *
 * List and manage healthcare provider organizations.
 *
 * GET /api/admin/providers
 * Query params:
 *   - status: "pending" | "approved" | "rejected" | "all" (default: "all")
 *   - search: string (searches name, email, practice number)
 *   - page: number (default: 1)
 *   - limit: number (default: 20, max: 100)
 *   - sortBy: "createdAt" | "name" | "status" (default: "createdAt")
 *   - sortOrder: "asc" | "desc" (default: "desc")
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Verify admin access
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    // Build where clause
    const where: {
      status?: string;
      OR?: Array<{
        name?: { contains: string; mode: "insensitive" };
        practiceNumber?: { contains: string; mode: "insensitive" };
      }>;
    } = {};

    if (status !== "all") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { practiceNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    // Build orderBy
    const orderBy: Record<string, "asc" | "desc"> = {};
    if (sortBy === "name") {
      orderBy.name = sortOrder;
    } else if (sortBy === "status") {
      orderBy.status = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // Get total count
    const totalCount = await prisma.organization.count({ where });

    // Get providers with member counts
    const providers = await prisma.organization.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: { members: true },
        },
        members: {
          where: { role: "admin" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    // Transform response
    const transformedProviders = providers.map((provider) => ({
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
      primaryContact: provider.members[0]?.user || null,
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: transformedProviders,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get providers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch providers" },
      { status: 500 }
    );
  }
}
