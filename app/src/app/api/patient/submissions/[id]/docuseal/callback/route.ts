/**
 * DocuSeal Callback Route for Authenticated Users
 *
 * GET /api/patient/submissions/[id]/docuseal/callback
 * Handles the redirect back from DocuSeal after signing.
 * Updates the submission status and redirects to the patient portal.
 *
 * Note: This callback is specifically for authenticated users.
 * Anonymous users use /api/public/submissions/[id]/docuseal/callback instead.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDocuSealSubmission } from "@/lib/docuseal";
import { getAppBaseUrl } from "@/lib/network";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get the base URL for redirects (uses network IP in development)
    const baseUrl = getAppBaseUrl();

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
            title: true,
          },
        },
      },
    });

    if (!submission) {
      // Redirect to error page
      return NextResponse.redirect(
        new URL(`/patient/submissions?error=not_found`, baseUrl)
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

    // For authenticated users, redirect to the patient portal with success message
    // Don't redirect to /c/[shortCode] as that's for the public form (anonymous users)
    // and may have issues detecting the authenticated session after external redirects
    return NextResponse.redirect(
      new URL(`/patient/submissions?signed=true&submission=${id}`, baseUrl)
    );
  } catch (error) {
    console.error("DocuSeal callback error:", error);
    // Use getAppBaseUrl() here too for consistency
    const errorBaseUrl = getAppBaseUrl();
    return NextResponse.redirect(
      new URL(`/patient/submissions?error=callback_failed`, errorBaseUrl)
    );
  }
}
