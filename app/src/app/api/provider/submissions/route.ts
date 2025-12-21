/**
 * Provider Submissions API
 *
 * List form submissions for the authenticated provider's organization.
 *
 * GET /api/provider/submissions - List submissions with filtering
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { logAuditEvent } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

// GET: List submissions for the organization
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user's organization
    const membership = await prisma.member.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const organizationId = membership.organizationId;
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const formId = searchParams.get("formId");
    const status = searchParams.get("status"); // "pending", "completed", "reviewed", or null for all
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      organizationId,
    };

    if (formId) {
      where.formTemplateId = formId;
    }

    if (status) {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        (where.createdAt as Record<string, Date>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        // Add 1 day to include the entire end date
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        (where.createdAt as Record<string, Date>).lt = endDate;
      }
    }

    // Get submissions with related data
    const [submissions, total, forms] = await Promise.all([
      prisma.submission.findMany({
        where,
        include: {
          formTemplate: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.submission.count({ where }),
      // Also fetch forms for the filter dropdown
      prisma.formTemplate.findMany({
        where: { organizationId },
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      }),
    ]);

    // Enrich submissions with user info where available
    const userIds = submissions
      .filter((s) => s.userId)
      .map((s) => s.userId as string);

    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true },
          })
        : [];

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Format submissions for response
    const formattedSubmissions = submissions.map((submission) => {
      const user = submission.userId ? userMap.get(submission.userId) : null;
      const data = JSON.parse(submission.data);

      // Try to extract patient name from data
      const patientName =
        user?.name ||
        data.firstName && data.lastName
          ? `${data.firstName} ${data.lastName}`
          : data.firstName || data.fullName || null;

      return {
        id: submission.id,
        formTemplate: submission.formTemplate,
        patientName,
        patientEmail: user?.email || data.email || null,
        isAnonymous: !submission.userId,
        status: submission.status,
        consentGiven: submission.consentGiven,
        source: submission.source,
        createdAt: submission.createdAt,
      };
    });

    // Log audit event
    await logAuditEvent({
      request,
      userId: session.user.id,
      organizationId,
      action: "LIST_SUBMISSIONS",
      resourceType: "Submission",
      metadata: {
        filters: { formId, status, dateFrom, dateTo, search },
        resultCount: submissions.length,
        totalCount: total,
      },
    });

    return NextResponse.json({
      submissions: formattedSubmissions,
      forms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List submissions error:", error);
    return NextResponse.json(
      { error: "Failed to list submissions" },
      { status: 500 }
    );
  }
}
