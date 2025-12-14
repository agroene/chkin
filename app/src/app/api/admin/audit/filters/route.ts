/**
 * Audit Log Filters API
 *
 * GET /api/admin/audit/filters - Get available filter values
 *
 * Returns distinct values for:
 * - actions
 * - resourceTypes
 * - users (with names)
 * - organizations (with names)
 *
 * @module api/admin/audit/filters
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  try {
    // Verify admin authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSystemAdmin: true },
    });

    if (!user?.isSystemAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get distinct actions
    const actionsResult = await prisma.auditLog.findMany({
      select: { action: true },
      distinct: ["action"],
      orderBy: { action: "asc" },
    });

    // Get distinct resource types
    const resourceTypesResult = await prisma.auditLog.findMany({
      select: { resourceType: true },
      distinct: ["resourceType"],
      orderBy: { resourceType: "asc" },
    });

    // Get users who have audit logs
    const usersResult = await prisma.auditLog.findMany({
      where: { userId: { not: null } },
      select: {
        userId: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      distinct: ["userId"],
    });

    // Get organizations that have audit logs
    const organizationsResult = await prisma.auditLog.findMany({
      where: { organizationId: { not: null } },
      select: {
        organizationId: true,
        organization: {
          select: {
            name: true,
          },
        },
      },
      distinct: ["organizationId"],
    });

    return NextResponse.json({
      actions: actionsResult.map((a) => a.action),
      resourceTypes: resourceTypesResult.map((r) => r.resourceType),
      users: usersResult
        .filter((u) => u.userId)
        .map((u) => ({
          id: u.userId,
          name: u.user?.name || "Unknown",
          email: u.user?.email || "",
        })),
      organizations: organizationsResult
        .filter((o) => o.organizationId)
        .map((o) => ({
          id: o.organizationId,
          name: o.organization?.name || "Unknown",
        })),
    });
  } catch (error) {
    console.error("Failed to fetch audit log filters:", error);
    return NextResponse.json(
      { error: "Failed to fetch filters" },
      { status: 500 }
    );
  }
}
