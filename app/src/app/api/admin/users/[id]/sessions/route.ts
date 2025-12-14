/**
 * User Sessions API
 *
 * DELETE /api/admin/users/[id]/sessions
 * Revokes all sessions for a user (effectively logging them out everywhere).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

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
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent admin from revoking their own sessions
    if (id === adminCheck.user!.id) {
      return NextResponse.json(
        { error: "You cannot revoke your own sessions from here" },
        { status: 400 }
      );
    }

    // Count sessions before deletion
    const sessionCount = await prisma.session.count({
      where: { userId: id },
    });

    // Delete all sessions for this user
    await prisma.session.deleteMany({
      where: { userId: id },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: adminCheck.user!.id,
        action: "REVOKE_USER_SESSIONS",
        resourceType: "User",
        resourceId: id,
        metadata: JSON.stringify({
          targetUserEmail: user.email,
          targetUserName: user.name,
          sessionsRevoked: sessionCount,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        userId: id,
        sessionsRevoked: sessionCount,
      },
    });
  } catch (error) {
    console.error("Revoke sessions error:", error);
    return NextResponse.json(
      { error: "Failed to revoke sessions" },
      { status: 500 }
    );
  }
}
