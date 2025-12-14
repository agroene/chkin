/**
 * Audit Log Export API
 *
 * GET /api/admin/audit/export - Export audit logs as CSV
 *
 * Query parameters (same as list endpoint):
 * - action: Filter by action type
 * - userId: Filter by user ID
 * - organizationId: Filter by organization ID
 * - resourceType: Filter by resource type
 * - resourceId: Filter by resource ID
 * - startDate: Filter from date (ISO string)
 * - endDate: Filter to date (ISO string)
 *
 * @module api/admin/audit/export
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");
    const userId = searchParams.get("userId");
    const organizationId = searchParams.get("organizationId");
    const resourceType = searchParams.get("resourceType");
    const resourceId = searchParams.get("resourceId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build where clause
    const where: Record<string, unknown> = {};

    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (organizationId) where.organizationId = organizationId;
    if (resourceType) where.resourceType = resourceType;
    if (resourceId) where.resourceId = resourceId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, Date>).lte = new Date(endDate);
      }
    }

    // Fetch all matching audit logs (limit to 10000 for safety)
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10000,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        organization: {
          select: {
            name: true,
          },
        },
      },
    });

    // Generate CSV
    const csvHeaders = [
      "Timestamp",
      "Action",
      "Resource Type",
      "Resource ID",
      "User Name",
      "User Email",
      "Organization",
      "IP Address",
      "User Agent",
      "Metadata",
    ];

    const csvRows = logs.map((log) => [
      log.createdAt.toISOString(),
      log.action,
      log.resourceType,
      log.resourceId || "",
      log.user?.name || "",
      log.user?.email || "",
      log.organization?.name || "",
      log.ipAddress || "",
      log.userAgent || "",
      log.metadata || "",
    ]);

    // Escape CSV values
    const escapeCSV = (value: string) => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvContent = [
      csvHeaders.map(escapeCSV).join(","),
      ...csvRows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n");

    // Return CSV file
    const filename = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Failed to export audit logs:", error);
    return NextResponse.json(
      { error: "Failed to export audit logs" },
      { status: 500 }
    );
  }
}
