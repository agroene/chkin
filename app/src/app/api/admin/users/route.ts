/**
 * Admin Users API
 *
 * List and manage platform users.
 *
 * GET /api/admin/users
 * Query params:
 *   - role: "all" | "admin" | "provider" | "patient" (default: "all")
 *   - status: "all" | "active" | "inactive" (default: "all")
 *   - search: string (searches name, email)
 *   - page: number (default: 1)
 *   - limit: number (default: 20, max: 100)
 *   - sortBy: "createdAt" | "name" | "email" (default: "createdAt")
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
    const role = searchParams.get("role") || "all";
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    // Build where clause
    interface WhereClause {
      isSystemAdmin?: boolean;
      emailVerified?: boolean;
      OR?: Array<{
        name?: { contains: string; mode: "insensitive" };
        email?: { contains: string; mode: "insensitive" };
      }>;
      members?: { some: object } | { none: object };
    }

    const where: WhereClause = {};

    // Filter by role
    if (role === "admin") {
      where.isSystemAdmin = true;
    } else if (role === "provider") {
      // Users who are members of at least one organization
      where.members = { some: {} };
      where.isSystemAdmin = false;
    } else if (role === "patient") {
      // Users who are not admins and have no organization memberships
      where.isSystemAdmin = false;
      where.members = { none: {} };
    }

    // Filter by status (using emailVerified as a proxy for active/inactive)
    // In future, we could add a dedicated "active" field
    if (status === "active") {
      where.emailVerified = true;
    } else if (status === "inactive") {
      where.emailVerified = false;
    }

    // Search by name or email
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Build orderBy
    const orderBy: Record<string, "asc" | "desc"> = {};
    if (sortBy === "name") {
      orderBy.name = sortOrder;
    } else if (sortBy === "email") {
      orderBy.email = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // Get total count
    const totalCount = await prisma.user.count({ where });

    // Get users with organization memberships
    const users = await prisma.user.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        isSystemAdmin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { members: true, sessions: true },
        },
        members: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
    });

    // Transform response
    const transformedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      isSystemAdmin: user.isSystemAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      organizationCount: user._count.members,
      sessionCount: user._count.sessions,
      organizations: user.members.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        status: m.organization.status,
        role: m.role,
      })),
      // Derive user type for display
      userType: user.isSystemAdmin
        ? "admin"
        : user.members.length > 0
          ? "provider"
          : "patient",
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: transformedUsers,
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
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
