/**
 * Public DocuSeal Submission API
 *
 * POST /api/public/submissions/[id]/docuseal
 * Creates a DocuSeal submission for PDF signing.
 * Works for both authenticated users and anonymous users (with email from form data).
 *
 * Authentication:
 * - Authenticated users: session-based verification
 * - Anonymous users: must include anonymousToken in request body OR
 *   submission must have been made in the last 30 minutes
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import {
  createDocuSealSubmission,
  getDocuSealSubmission,
  mapFieldValues,
} from "@/lib/docuseal";
import { getAppBaseUrl, getDocuSealUrl } from "@/lib/network";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST: Create DocuSeal submission (public - works for anonymous users)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { anonymousToken } = body as { anonymousToken?: string };

    // Check if user is authenticated
    let userId: string | null = null;
    let userEmail: string | null = null;
    let userName: string | null = null;

    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (session?.user) {
        userId = session.user.id;
        userEmail = session.user.email;
        userName = session.user.name || session.user.email.split("@")[0];
      }
    } catch {
      // Not authenticated - will check anonymous access
    }

    // Get the submission with form template
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        formTemplate: {
          select: {
            id: true,
            title: true,
            pdfEnabled: true,
            docusealTemplateId: true,
            pdfFieldMappings: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Verify access
    if (userId) {
      // Authenticated user - verify ownership
      if (submission.userId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      // Anonymous user - verify via token or recent submission
      const isValidToken =
        anonymousToken && submission.anonymousToken === anonymousToken;
      const isRecent =
        !submission.userId &&
        new Date().getTime() - new Date(submission.createdAt).getTime() <
          30 * 60 * 1000; // 30 minutes

      if (!isValidToken && !isRecent) {
        return NextResponse.json(
          { error: "Invalid token or session expired" },
          { status: 403 }
        );
      }
    }

    // Check if PDF is enabled for this form
    if (!submission.formTemplate.pdfEnabled) {
      return NextResponse.json(
        { error: "PDF signing is not enabled for this form" },
        { status: 400 }
      );
    }

    if (!submission.formTemplate.docusealTemplateId) {
      return NextResponse.json(
        { error: "No PDF template configured for this form" },
        { status: 400 }
      );
    }

    // Check if already signed
    if (submission.signedAt) {
      return NextResponse.json(
        { error: "Document has already been signed" },
        { status: 400 }
      );
    }

    // Check if DocuSeal submission already exists
    if (submission.docusealSubmissionId) {
      try {
        const existingSubmission = await getDocuSealSubmission(
          submission.docusealSubmissionId
        );

        if (existingSubmission) {
          const docusealUrl = getDocuSealUrl();
          const signingUrl = `${docusealUrl}/s/${submission.docusealSubmissionId}`;

          return NextResponse.json({
            success: true,
            submissionId: submission.docusealSubmissionId,
            signingUrl,
          });
        }
      } catch {
        console.log(
          `[DocuSeal] Submission ${submission.docusealSubmissionId} not found, creating new one`
        );
      }

      // Clear the stale DocuSeal submission ID
      await prisma.submission.update({
        where: { id },
        data: { docusealSubmissionId: null },
      });
    }

    // Parse submission data and field mappings
    let submissionData: Record<string, unknown> = {};
    try {
      submissionData = JSON.parse(submission.data);
    } catch {
      submissionData = {};
    }

    let fieldMappings: Record<string, string> = {};
    if (submission.formTemplate.pdfFieldMappings) {
      try {
        fieldMappings = JSON.parse(submission.formTemplate.pdfFieldMappings);
      } catch {
        fieldMappings = {};
      }
    }

    // Map Chkin values to DocuSeal fields
    const docusealValues = mapFieldValues(submissionData, fieldMappings);

    // Get email and name for DocuSeal
    // Priority: authenticated user > form submission data
    let signerEmail = userEmail;
    let signerName = userName;

    if (!signerEmail) {
      // Try to get email from submission data
      signerEmail =
        (submissionData.emailPersonal as string) ||
        (submissionData.email as string) ||
        null;
    }

    if (!signerName) {
      // Try to get name from submission data
      const firstName = submissionData.firstName as string;
      const lastName = submissionData.lastName as string;
      if (firstName || lastName) {
        signerName = [firstName, lastName].filter(Boolean).join(" ");
      }
    }

    // DocuSeal requires an email - if none available, use a placeholder
    if (!signerEmail) {
      // Generate a unique anonymous email for DocuSeal
      signerEmail = `anonymous-${submission.id.slice(0, 8)}@chkin.local`;
    }

    if (!signerName) {
      signerName = "Anonymous Patient";
    }

    // Create DocuSeal submission
    const appBaseUrl = getAppBaseUrl();
    console.log("[DocuSeal Public] appBaseUrl:", appBaseUrl);

    const webhookUrl = `${appBaseUrl}/api/webhooks/docuseal`;

    // For anonymous users, redirect back to the public form page
    // We need to know the shortCode, so we'll get it from the form's QR codes
    const qrCode = await prisma.qRCode.findFirst({
      where: {
        formTemplateId: submission.formTemplate.id,
        isActive: true,
      },
      select: { shortCode: true },
    });

    const callbackUrl = qrCode
      ? `${appBaseUrl}/c/${qrCode.shortCode}?signed=true&submission=${submission.id}`
      : `${appBaseUrl}/api/public/submissions/${id}/docuseal/callback`;

    console.log("[DocuSeal Public] callbackUrl:", callbackUrl);

    const docusealResult = await createDocuSealSubmission({
      templateId: submission.formTemplate.docusealTemplateId,
      email: signerEmail,
      name: signerName,
      fieldValues: docusealValues,
      externalId: submission.id,
      webhookUrl,
      completedRedirectUrl: callbackUrl,
    });

    // Update submission with DocuSeal ID
    await prisma.submission.update({
      where: { id },
      data: {
        docusealSubmissionId: docusealResult.submissionId,
      },
    });

    // Return the direct signing URL
    const docusealUrl = getDocuSealUrl();

    // Replace any localhost/127.0.0.1 in the embed URL with the network-accessible DocuSeal URL
    let signingUrl = docusealResult.embedUrl;
    if (signingUrl.includes("localhost") || signingUrl.includes("127.0.0.1")) {
      const urlParts = new URL(signingUrl);
      const docusealUrlParts = new URL(docusealUrl);
      urlParts.host = docusealUrlParts.host;
      urlParts.protocol = docusealUrlParts.protocol;
      signingUrl = urlParts.toString();
    }

    return NextResponse.json({
      success: true,
      submissionId: docusealResult.submissionId,
      signingUrl,
    });
  } catch (error) {
    console.error("Create DocuSeal submission error:", error);
    return NextResponse.json(
      { error: "Failed to create PDF signing session" },
      { status: 500 }
    );
  }
}
