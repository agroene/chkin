/**
 * Single User API
 *
 * GET /api/admin/users/[id]
 * Fetches details for a single user.
 *
 * PATCH /api/admin/users/[id]
 * Updates user details (name, isSystemAdmin, emailVerified).
 *
 * DELETE /api/admin/users/[id]
 * Deletes a user and all associated data.
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

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { members: true, sessions: true },
        },
        members: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                industryType: true,
              },
            },
          },
        },
        sessions: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true,
            expiresAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Transform response
    const transformedUser = {
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
        slug: m.organization.slug,
        status: m.organization.status,
        industryType: m.organization.industryType,
        role: m.role,
        memberSince: m.createdAt,
      })),
      recentSessions: user.sessions.map((s) => ({
        id: s.id,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        isActive: new Date(s.expiresAt) > new Date(),
      })),
      userType: user.isSystemAdmin
        ? "admin"
        : user.members.length > 0
          ? "provider"
          : "patient",
    };

    return NextResponse.json({
      success: true,
      data: transformedUser,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent admin from demoting themselves
    if (id === adminCheck.user!.id && body.isSystemAdmin === false) {
      return NextResponse.json(
        { error: "You cannot remove your own admin privileges" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: {
      name?: string;
      isSystemAdmin?: boolean;
      emailVerified?: boolean;
    } = {};

    if (typeof body.name === "string" && body.name.trim()) {
      updateData.name = body.name.trim();
    }

    if (typeof body.isSystemAdmin === "boolean") {
      updateData.isSystemAdmin = body.isSystemAdmin;
    }

    if (typeof body.emailVerified === "boolean") {
      updateData.emailVerified = body.emailVerified;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        isSystemAdmin: true,
        updatedAt: true,
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: adminCheck.user!.id,
        action: "UPDATE_USER",
        resourceType: "User",
        resourceId: id,
        metadata: JSON.stringify({
          targetUserEmail: existingUser.email,
          changes: updateData,
          previousValues: {
            name: existingUser.name,
            isSystemAdmin: existingUser.isSystemAdmin,
            emailVerified: existingUser.emailVerified,
          },
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

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

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent admin from deleting themselves
    if (id === adminCheck.user!.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Prevent deleting other system admins (safety measure)
    if (existingUser.isSystemAdmin) {
      return NextResponse.json(
        { error: "Cannot delete system administrator accounts. Remove admin privileges first." },
        { status: 400 }
      );
    }

    // Check if user is the sole owner of any organizations
    const ownedOrgs = existingUser.members.filter(m => m.role === "owner");
    for (const membership of ownedOrgs) {
      const otherOwners = await prisma.member.count({
        where: {
          organizationId: membership.organizationId,
          role: "owner",
          userId: { not: id },
        },
      });
      if (otherOwners === 0) {
        return NextResponse.json(
          {
            error: `Cannot delete user: They are the sole owner of "${membership.organization.name}". Delete the organization from Admin > Providers first, or transfer ownership to another user.`,
            organizationId: membership.organizationId,
            organizationName: membership.organization.name,
          },
          { status: 400 }
        );
      }
    }

    // Delete user (cascades to sessions, accounts, members, pending registrations due to schema relations)
    await prisma.user.delete({
      where: { id },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: adminCheck.user!.id,
        action: "DELETE_USER",
        resourceType: "User",
        resourceId: id,
        metadata: JSON.stringify({
          deletedUserEmail: existingUser.email,
          deletedUserName: existingUser.name,
          hadOrganizations: existingUser.members.length,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `User "${existingUser.name}" (${existingUser.email}) has been deleted`,
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
