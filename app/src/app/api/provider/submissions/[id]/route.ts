/**
 * Provider Submission Detail API
 *
 * Get and update individual submission details.
 *
 * GET /api/provider/submissions/[id] - Get submission detail
 * PATCH /api/provider/submissions/[id] - Update submission (mark as reviewed)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { logAuditEvent } from "@/lib/audit-log";
import { calculateConsentStatus, getConsentStatusBadge } from "@/lib/consent-status";
import { transformDocuSealUrl } from "@/lib/network";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper to verify submission belongs to user's organization
async function verifySubmissionAccess(userId: string, submissionId: string) {
  const membership = await prisma.member.findFirst({
    where: { userId },
    select: { organizationId: true },
  });

  if (!membership) {
    return { error: "No organization found", status: 404 };
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      formTemplate: {
        include: {
          fields: {
            include: {
              fieldDefinition: true,
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
    // Also include time-bound consent fields
  });

  if (!submission) {
    return { error: "Submission not found", status: 404 };
  }

  if (submission.organizationId !== membership.organizationId) {
    return { error: "Forbidden", status: 403 };
  }

  return { submission, organizationId: membership.organizationId };
}

// GET: Get submission detail
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await verifySubmissionAccess(session.user.id, id);
    if ("error" in access) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const { submission, organizationId } = access;

    // Get user info if authenticated submission
    let user = null;
    if (submission.userId) {
      user = await prisma.user.findUnique({
        where: { id: submission.userId },
        select: { id: true, name: true, email: true },
      });
    }

    // Parse submission data
    const submissionData = JSON.parse(submission.data);

    // Map data to field definitions for structured display
    const formFields = submission.formTemplate.fields.map((field) => {
      const fieldName = field.fieldDefinition.name;
      const value = submissionData[fieldName];

      return {
        id: field.id,
        name: fieldName,
        label: field.labelOverride || field.fieldDefinition.label,
        type: field.fieldDefinition.fieldType,
        section: field.section,
        value: value !== undefined ? value : null,
        isRequired: field.isRequired,
      };
    });

    // Group fields by section
    const sections: Record<string, typeof formFields> = {};
    for (const field of formFields) {
      const sectionName = field.section || "General";
      if (!sections[sectionName]) {
        sections[sectionName] = [];
      }
      sections[sectionName].push(field);
    }

    // Log audit event
    await logAuditEvent({
      request,
      userId: session.user.id,
      organizationId,
      action: "VIEW_SUBMISSION",
      resourceType: "Submission",
      resourceId: id,
      metadata: {
        formTemplateId: submission.formTemplateId,
        formTitle: submission.formTemplate.title,
      },
    });

    // Calculate consent status
    const consentStatusResult = calculateConsentStatus({
      consentGiven: submission.consentGiven,
      consentAt: submission.consentAt,
      consentExpiresAt: submission.consentExpiresAt,
      consentWithdrawnAt: submission.consentWithdrawnAt,
      gracePeriodDays: submission.formTemplate.gracePeriodDays,
    });
    const statusBadge = getConsentStatusBadge(consentStatusResult.status);

    return NextResponse.json({
      submission: {
        id: submission.id,
        formTemplate: {
          id: submission.formTemplate.id,
          title: submission.formTemplate.title,
          defaultConsentDuration: submission.formTemplate.defaultConsentDuration,
          gracePeriodDays: submission.formTemplate.gracePeriodDays,
        },
        user: user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
            }
          : null,
        isAnonymous: !submission.userId,
        status: submission.status,
        // Legacy consent fields for backwards compatibility
        consentGiven: submission.consentGiven,
        consentAt: submission.consentAt,
        // Time-bound consent info
        consent: {
          given: submission.consentGiven,
          givenAt: submission.consentAt,
          expiresAt: submission.consentExpiresAt,
          withdrawnAt: submission.consentWithdrawnAt,
          durationMonths: submission.consentDurationMonths,
          autoRenew: submission.autoRenew,
          renewedAt: submission.renewedAt,
          renewalCount: submission.renewalCount,
          // Computed status
          status: consentStatusResult.status,
          statusLabel: statusBadge.label,
          statusColor: statusBadge.color,
          isAccessible: consentStatusResult.isAccessible,
          daysRemaining: consentStatusResult.daysRemaining,
          gracePeriodEndsAt: consentStatusResult.gracePeriodEndsAt,
          renewalUrgency: consentStatusResult.renewalUrgency,
          message: consentStatusResult.message,
        },
        source: submission.source,
        ipAddress: submission.ipAddress,
        userAgent: submission.userAgent,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
        // PDF signing info
        pdfSigning: {
          hasPdf: !!submission.docusealSubmissionId,
          docusealSubmissionId: submission.docusealSubmissionId,
          isSigned: !!submission.signedAt,
          signedAt: submission.signedAt,
          signedDocumentUrl: transformDocuSealUrl(submission.signedDocumentUrl),
        },
      },
      fields: formFields,
      sections,
      rawData: submissionData,
    });
  } catch (error) {
    console.error("Get submission error:", error);
    return NextResponse.json(
      { error: "Failed to get submission" },
      { status: 500 }
    );
  }
}

// PATCH: Update submission (mark as reviewed)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await verifySubmissionAccess(session.user.id, id);
    if ("error" in access) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const { submission, organizationId } = access;
    const body = await request.json();

    // Only allow status updates for now
    const allowedStatuses = ["pending", "completed", "reviewed"];
    if (body.status && !allowedStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const updatedSubmission = await prisma.submission.update({
      where: { id },
      data: {
        status: body.status || submission.status,
      },
    });

    // Log audit event
    await logAuditEvent({
      request,
      userId: session.user.id,
      organizationId,
      action: "UPDATE_SUBMISSION",
      resourceType: "Submission",
      resourceId: id,
      metadata: {
        previousStatus: submission.status,
        newStatus: updatedSubmission.status,
        formTemplateId: submission.formTemplateId,
      },
    });

    return NextResponse.json({
      submission: {
        id: updatedSubmission.id,
        status: updatedSubmission.status,
        updatedAt: updatedSubmission.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update submission error:", error);
    return NextResponse.json(
      { error: "Failed to update submission" },
      { status: 500 }
    );
  }
}
