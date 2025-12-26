/**
 * DocuSeal Submission API for Patients
 *
 * POST /api/patient/submissions/[id]/docuseal
 * Creates a DocuSeal submission with pre-filled values from the Chkin submission.
 * Returns a signing URL for redirect-based signing (Pro embeds not available).
 *
 * GET /api/patient/submissions/[id]/docuseal
 * Gets the DocuSeal signing status for a submission.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import {
  createDocuSealSubmission,
  getDocuSealSubmission,
  mapFieldValues,
  FieldDefinitionForMapping,
} from "@/lib/docuseal";
import { getAppBaseUrl, getDocuSealUrl } from "@/lib/network";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST: Create DocuSeal submission
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the submission with form template and field definitions
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        formTemplate: {
          select: {
            id: true,
            pdfEnabled: true,
            docusealTemplateId: true,
            pdfFieldMappings: true,
            fields: {
              select: {
                fieldDefinition: {
                  select: {
                    name: true,
                    fieldType: true,
                    config: true,
                  },
                },
              },
            },
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

    // Verify ownership
    if (submission.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      // Verify the DocuSeal submission still exists before returning its URL
      try {
        const existingSubmission = await getDocuSealSubmission(
          submission.docusealSubmissionId
        );

        if (existingSubmission) {
          // Submission exists - get stored signing URL or fetch from existing submission
          const storedSigningUrl = await prisma.submission.findUnique({
            where: { id },
            select: { docusealSigningUrl: true },
          });

          if (storedSigningUrl?.docusealSigningUrl) {
            // Replace any localhost/127.0.0.1 in the stored URL with the network-accessible DocuSeal URL
            const docusealUrl = getDocuSealUrl();
            let signingUrl = storedSigningUrl.docusealSigningUrl;
            if (signingUrl.includes("localhost") || signingUrl.includes("127.0.0.1")) {
              const urlParts = new URL(signingUrl);
              const docusealUrlParts = new URL(docusealUrl);
              urlParts.host = docusealUrlParts.host;
              urlParts.protocol = docusealUrlParts.protocol;
              signingUrl = urlParts.toString();
            }

            return NextResponse.json({
              success: true,
              submissionId: submission.docusealSubmissionId,
              signingUrl,
            });
          }
          // If no stored URL, fall through to create a new submission
          console.log(
            `[DocuSeal] No stored signing URL for submission ${submission.docusealSubmissionId}, creating new one`
          );
        }
      } catch {
        // DocuSeal submission doesn't exist or API error - will create a new one
        console.log(
          `[DocuSeal] Submission ${submission.docusealSubmissionId} not found, creating new one`
        );
      }

      // Clear the stale DocuSeal submission ID and URL
      await prisma.submission.update({
        where: { id },
        data: { docusealSubmissionId: null, docusealSigningUrl: null },
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

    // Build field definitions for resolving select labels
    const fieldDefinitions: FieldDefinitionForMapping[] = submission.formTemplate.fields.map(f => ({
      name: f.fieldDefinition.name,
      fieldType: f.fieldDefinition.fieldType,
      config: f.fieldDefinition.config ? JSON.parse(f.fieldDefinition.config as string) : null,
    }));

    // Map Chkin values to DocuSeal fields
    const docusealValues = mapFieldValues(submissionData, fieldMappings, fieldDefinitions);

    // Get user name for DocuSeal
    const userName = session.user.name || session.user.email.split("@")[0];

    // Create DocuSeal submission
    const appBaseUrl = getAppBaseUrl();
    console.log("[DocuSeal] appBaseUrl:", appBaseUrl);
    console.log("[DocuSeal] NODE_ENV:", process.env.NODE_ENV);

    const webhookUrl = `${appBaseUrl}/api/webhooks/docuseal`;
    const callbackUrl = `${appBaseUrl}/api/patient/submissions/${id}/docuseal/callback`;
    console.log("[DocuSeal] callbackUrl:", callbackUrl);

    const docusealResult = await createDocuSealSubmission({
      templateId: submission.formTemplate.docusealTemplateId,
      email: session.user.email,
      name: userName,
      fieldValues: docusealValues,
      externalId: submission.id,
      webhookUrl,
      completedRedirectUrl: callbackUrl,
    });

    // Update submission with DocuSeal ID and signing URL
    await prisma.submission.update({
      where: { id },
      data: {
        docusealSubmissionId: docusealResult.submissionId,
        docusealSigningUrl: docusealResult.embedUrl,
      },
    });

    // Return the direct signing URL
    // The embedUrl from DocuSeal might use localhost, so we need to replace it with the network IP
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
    // Include more details in dev/test environments
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "Failed to create PDF signing session",
        details: process.env.NODE_ENV !== "production" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

// GET: Get DocuSeal submission status
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the submission
    const submission = await prisma.submission.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        docusealSubmissionId: true,
        signedDocumentUrl: true,
        signedAt: true,
        formTemplate: {
          select: {
            pdfEnabled: true,
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

    // Verify ownership
    if (submission.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If not a PDF form, return not applicable
    if (!submission.formTemplate.pdfEnabled) {
      return NextResponse.json({
        pdfEnabled: false,
        status: "not_applicable",
      });
    }

    // If no DocuSeal submission yet
    if (!submission.docusealSubmissionId) {
      return NextResponse.json({
        pdfEnabled: true,
        status: "pending",
        signedAt: null,
        signedDocumentUrl: null,
      });
    }

    // If already have signed info in DB
    if (submission.signedAt) {
      return NextResponse.json({
        pdfEnabled: true,
        status: "completed",
        signedAt: submission.signedAt,
        signedDocumentUrl: submission.signedDocumentUrl,
      });
    }

    // Check status from DocuSeal
    try {
      const docusealSubmission = await getDocuSealSubmission(
        submission.docusealSubmissionId
      );

      if (docusealSubmission?.completedAt) {
        // Update our DB with the completed info
        const signedUrl = docusealSubmission.documents[0]?.url || null;

        await prisma.submission.update({
          where: { id },
          data: {
            signedAt: new Date(docusealSubmission.completedAt),
            signedDocumentUrl: signedUrl,
          },
        });

        return NextResponse.json({
          pdfEnabled: true,
          status: "completed",
          signedAt: docusealSubmission.completedAt,
          signedDocumentUrl: signedUrl,
        });
      }

      return NextResponse.json({
        pdfEnabled: true,
        status: docusealSubmission?.status || "pending",
        signedAt: null,
        signedDocumentUrl: null,
      });
    } catch {
      // If DocuSeal API fails, return what we have
      return NextResponse.json({
        pdfEnabled: true,
        status: "unknown",
        signedAt: submission.signedAt,
        signedDocumentUrl: submission.signedDocumentUrl,
      });
    }
  } catch (error) {
    console.error("Get DocuSeal status error:", error);
    return NextResponse.json(
      { error: "Failed to get signing status" },
      { status: 500 }
    );
  }
}
