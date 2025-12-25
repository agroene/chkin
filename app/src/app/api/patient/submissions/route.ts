/**
 * Patient Submissions API
 *
 * Returns all form submissions for the authenticated patient.
 * Includes form template info, organization, consent status.
 *
 * GET /api/patient/submissions - List all submissions
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { calculateConsentStatus, getConsentStatusBadge } from "@/lib/consent-status";
import { transformDocuSealUrl } from "@/lib/network";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all submissions for this user
    const submissions = await prisma.submission.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        formTemplateId: true,
        organizationId: true,
        data: true,
        consentGiven: true,
        consentAt: true,
        consentToken: true,
        consentWithdrawnAt: true,
        withdrawalReason: true,
        consentExpiresAt: true,
        consentDurationMonths: true,
        autoRenew: true,
        renewedAt: true,
        renewalCount: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        // PDF signing fields
        docusealSubmissionId: true,
        signedAt: true,
        signedDocumentUrl: true,
        formTemplate: {
          select: {
            id: true,
            title: true,
            description: true,
            consentClause: true,
            defaultConsentDuration: true,
            gracePeriodDays: true,
            allowAutoRenewal: true,
            pdfEnabled: true,
            organization: {
              select: {
                id: true,
                name: true,
                logo: true,
                industryType: true,
              },
            },
          },
        },
      },
    });

    // Transform submissions to include parsed data and organization info
    const transformedSubmissions = submissions.map((submission) => {
      const parsedData = JSON.parse(submission.data);

      // Get a preview of the submitted data (first few key fields)
      const preview: Record<string, string> = {};
      const previewFields = ["firstName", "lastName", "dateOfBirth", "email", "phone"];
      for (const field of previewFields) {
        if (parsedData[field]) {
          preview[field] = parsedData[field];
        }
      }

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
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
        status: submission.status,
        // Consent info - enhanced with time-bound status
        consent: {
          given: submission.consentGiven,
          givenAt: submission.consentAt,
          token: submission.consentToken,
          withdrawnAt: submission.consentWithdrawnAt,
          withdrawalReason: submission.withdrawalReason,
          // Time-bound consent fields
          expiresAt: submission.consentExpiresAt,
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
          canRenew: consentStatusResult.canRenew,
          renewalUrgency: consentStatusResult.renewalUrgency,
          message: consentStatusResult.message,
          // Legacy isActive for backwards compatibility
          isActive: consentStatusResult.isAccessible && consentStatusResult.status !== "WITHDRAWN",
        },
        // Form info
        form: {
          id: submission.formTemplate.id,
          title: submission.formTemplate.title,
          description: submission.formTemplate.description,
          consentClause: submission.formTemplate.consentClause,
          defaultConsentDuration: submission.formTemplate.defaultConsentDuration,
          gracePeriodDays: submission.formTemplate.gracePeriodDays,
          allowAutoRenewal: submission.formTemplate.allowAutoRenewal,
        },
        // Organization info
        organization: submission.formTemplate.organization,
        // PDF signing info
        pdfSigning: {
          hasPdf: submission.formTemplate.pdfEnabled || false,
          isSigned: !!submission.signedAt,
          signedAt: submission.signedAt,
          signedDocumentUrl: transformDocuSealUrl(submission.signedDocumentUrl),
        },
        // Data preview (not full data - that's on detail view)
        preview,
        // Field count
        fieldCount: Object.keys(parsedData).length,
      };
    });

    return NextResponse.json({
      submissions: transformedSubmissions,
      total: transformedSubmissions.length,
    });
  } catch (error) {
    console.error("Get patient submissions error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to get submissions", details: errorMessage },
      { status: 500 }
    );
  }
}
