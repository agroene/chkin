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

    console.log("[DocuSeal Callback] Received callback for submission:", id);

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
      console.log("[DocuSeal Callback] Submission not found:", id);
      // Redirect to error page
      return NextResponse.redirect(
        new URL(`/patient/submissions?error=not_found`, baseUrl)
      );
    }

    console.log("[DocuSeal Callback] Found submission:", {
      id: submission.id,
      docusealSubmissionId: submission.docusealSubmissionId,
      signedAt: submission.signedAt,
    });

    // If we have a DocuSeal submission ID, check its status
    if (submission.docusealSubmissionId && !submission.signedAt) {
      try {
        console.log("[DocuSeal Callback] Fetching DocuSeal submission status for:", submission.docusealSubmissionId);
        const docusealSubmission = await getDocuSealSubmission(
          submission.docusealSubmissionId
        );

        console.log("[DocuSeal Callback] DocuSeal API response:", JSON.stringify(docusealSubmission, null, 2));

        if (docusealSubmission?.completedAt) {
          // Update the submission with signed status
          const signedUrl = docusealSubmission.documents[0]?.url || null;

          console.log("[DocuSeal Callback] Updating submission with signedAt:", docusealSubmission.completedAt);
          await prisma.submission.update({
            where: { id },
            data: {
              signedAt: new Date(docusealSubmission.completedAt),
              signedDocumentUrl: signedUrl,
            },
          });
          console.log("[DocuSeal Callback] Successfully updated submission signedAt");
        } else {
          console.log("[DocuSeal Callback] DocuSeal submission not yet completed, status:", docusealSubmission?.status);
        }
      } catch (error) {
        console.error("[DocuSeal Callback] Failed to check DocuSeal submission status:", error);
        // Continue anyway - the webhook will update the status later
      }
    } else {
      console.log("[DocuSeal Callback] Skipping DocuSeal check - already signed or no docusealSubmissionId");
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
