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
import { calculateConsentStatus, getConsentStatusBadge } from "@/lib/consent-status";
import { transformDocuSealUrl } from "@/lib/network";

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
    const consentStatus = searchParams.get("consentStatus"); // "active", "expiring", "expired", "withdrawn", or null for all
    const patientType = searchParams.get("patientType"); // "registered", "anonymous", or null for all
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

    // Filter by patient type (registered = has userId, anonymous = no userId)
    if (patientType === "registered") {
      where.userId = { not: null };
    } else if (patientType === "anonymous") {
      where.userId = null;
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
              gracePeriodDays: true,
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

    // Format submissions for response with consent status
    const formattedSubmissions = submissions.map((submission) => {
      const user = submission.userId ? userMap.get(submission.userId) : null;
      const data = JSON.parse(submission.data);

      // Try to extract patient name from data
      const patientName =
        user?.name ||
        data.firstName && data.lastName
          ? `${data.firstName} ${data.lastName}`
          : data.firstName || data.fullName || null;

      // Calculate consent status
      const consentStatusResult = calculateConsentStatus({
        consentGiven: submission.consentGiven,
        consentAt: submission.consentAt,
        consentExpiresAt: submission.consentExpiresAt,
        consentWithdrawnAt: submission.consentWithdrawnAt,
        gracePeriodDays: submission.formTemplate.gracePeriodDays,
      });
      const statusBadge = getConsentStatusBadge(consentStatusResult.status);

      return {
        id: submission.id,
        formTemplate: {
          id: submission.formTemplate.id,
          title: submission.formTemplate.title,
        },
        patientName,
        patientEmail: user?.email || data.email || null,
        isAnonymous: !submission.userId,
        // Conversion tracking - was this anonymous user converted to registered?
        claimedAt: submission.claimedAt,
        status: submission.status,
        consentGiven: submission.consentGiven,
        // Time-bound consent info
        consent: {
          given: submission.consentGiven,
          givenAt: submission.consentAt,
          expiresAt: submission.consentExpiresAt,
          withdrawnAt: submission.consentWithdrawnAt,
          status: consentStatusResult.status,
          statusLabel: statusBadge.label,
          statusColor: statusBadge.color,
          isAccessible: consentStatusResult.isAccessible,
          daysRemaining: consentStatusResult.daysRemaining,
          renewalUrgency: consentStatusResult.renewalUrgency,
          message: consentStatusResult.message,
        },
        // PDF signing info
        pdfSigning: {
          hasPdf: !!submission.docusealSubmissionId,
          isSigned: !!submission.signedAt,
          signedAt: submission.signedAt,
          signedDocumentUrl: transformDocuSealUrl(submission.signedDocumentUrl),
        },
        source: submission.source,
        createdAt: submission.createdAt,
      };
    });

    // Filter by consent status if requested (post-query filtering since it's computed)
    let filteredSubmissions = formattedSubmissions;
    if (consentStatus) {
      const statusMap: Record<string, string[]> = {
        active: ["ACTIVE"],
        expiring: ["EXPIRING"],
        expired: ["GRACE", "EXPIRED"],
        withdrawn: ["WITHDRAWN"],
      };
      const targetStatuses = statusMap[consentStatus] || [];
      filteredSubmissions = formattedSubmissions.filter((s) =>
        targetStatuses.includes(s.consent.status)
      );
    }

    // Calculate consent status summary
    const consentSummary = {
      active: formattedSubmissions.filter((s) => s.consent.status === "ACTIVE").length,
      expiring: formattedSubmissions.filter((s) => s.consent.status === "EXPIRING").length,
      grace: formattedSubmissions.filter((s) => s.consent.status === "GRACE").length,
      expired: formattedSubmissions.filter((s) => s.consent.status === "EXPIRED").length,
      withdrawn: formattedSubmissions.filter((s) => s.consent.status === "WITHDRAWN").length,
      neverGiven: formattedSubmissions.filter((s) => s.consent.status === "NEVER_GIVEN").length,
    };

    // Log audit event
    await logAuditEvent({
      request,
      userId: session.user.id,
      organizationId,
      action: "LIST_SUBMISSIONS",
      resourceType: "Submission",
      metadata: {
        filters: { formId, status, consentStatus, patientType, dateFrom, dateTo, search },
        resultCount: filteredSubmissions.length,
        totalCount: total,
      },
    });

    return NextResponse.json({
      submissions: filteredSubmissions,
      forms,
      consentSummary,
      pagination: {
        page,
        limit,
        total: consentStatus ? filteredSubmissions.length : total,
        totalPages: Math.ceil((consentStatus ? filteredSubmissions.length : total) / limit),
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
