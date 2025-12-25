/**
 * DocuSeal Callback Route
 *
 * GET /api/patient/submissions/[id]/docuseal/callback
 * Handles the redirect back from DocuSeal after signing.
 * Updates the submission status and redirects to the completion page.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDocuSealSubmission } from "@/lib/docuseal";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get the submission
    const submission = await prisma.submission.findUnique({
      where: { id },
      select: {
        id: true,
        docusealSubmissionId: true,
        signedAt: true,
        formTemplate: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!submission) {
      // Redirect to error page
      return NextResponse.redirect(
        new URL(`/patient/submissions?error=not_found`, request.url)
      );
    }

    // If we have a DocuSeal submission ID, check its status
    if (submission.docusealSubmissionId && !submission.signedAt) {
      try {
        const docusealSubmission = await getDocuSealSubmission(
          submission.docusealSubmissionId
        );

        if (docusealSubmission?.completedAt) {
          // Update the submission with signed status
          const signedUrl = docusealSubmission.documents[0]?.url || null;

          await prisma.submission.update({
            where: { id },
            data: {
              signedAt: new Date(docusealSubmission.completedAt),
              signedDocumentUrl: signedUrl,
            },
          });
        }
      } catch (error) {
        console.error("Failed to check DocuSeal submission status:", error);
        // Continue anyway - the webhook will update the status later
      }
    }

    // Get the original form shortcode to redirect back
    const qrCode = await prisma.qRCode.findFirst({
      where: {
        formTemplateId: submission.formTemplate.id,
        isActive: true,
      },
      select: { shortCode: true },
    });

    // Redirect to completion page
    // If we have the short code, redirect to the form completion
    // Otherwise, redirect to patient submissions page
    if (qrCode?.shortCode) {
      return NextResponse.redirect(
        new URL(`/c/${qrCode.shortCode}?signed=true&submission=${id}`, request.url)
      );
    }

    return NextResponse.redirect(
      new URL(`/patient/submissions/${id}?signed=true`, request.url)
    );
  } catch (error) {
    console.error("DocuSeal callback error:", error);
    return NextResponse.redirect(
      new URL(`/patient/submissions?error=callback_failed`, request.url)
    );
  }
}
