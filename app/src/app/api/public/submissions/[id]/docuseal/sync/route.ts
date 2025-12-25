/**
 * Public DocuSeal Sync Route
 *
 * POST /api/public/submissions/[id]/docuseal/sync
 * Syncs the signature status from DocuSeal to our database.
 * This is called when the user returns from DocuSeal signing,
 * as webhooks may not work in local development environments.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDocuSealSubmission } from "@/lib/docuseal";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get the submission
    const submission = await prisma.submission.findUnique({
      where: { id },
      select: {
        id: true,
        docusealSubmissionId: true,
        signedAt: true,
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // If already signed, nothing to do
    if (submission.signedAt) {
      return NextResponse.json({
        success: true,
        alreadySigned: true,
        signedAt: submission.signedAt,
      });
    }

    // If no DocuSeal submission ID, nothing to sync
    if (!submission.docusealSubmissionId) {
      return NextResponse.json({
        success: true,
        noDocuSealSubmission: true,
      });
    }

    // Check status from DocuSeal
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

        console.log("[DocuSeal Sync] Updated submission with signed status:", id);

        return NextResponse.json({
          success: true,
          synced: true,
          signedAt: docusealSubmission.completedAt,
          signedDocumentUrl: signedUrl,
        });
      }

      return NextResponse.json({
        success: true,
        status: docusealSubmission?.status || "pending",
      });
    } catch (error) {
      console.error("[DocuSeal Sync] Failed to check DocuSeal status:", error);
      return NextResponse.json({
        success: false,
        error: "Failed to check DocuSeal status",
      });
    }
  } catch (error) {
    console.error("[DocuSeal Sync] Error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
