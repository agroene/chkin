/**
 * DocuSeal Submission API for Patients
 *
 * POST /api/patient/submissions/[id]/docuseal
 * Creates a DocuSeal submission with pre-filled values from the Chkin submission.
 * Returns a JWT token for embedding the DocuSeal Form component.
 *
 * GET /api/patient/submissions/[id]/docuseal
 * Gets the DocuSeal signing status for a submission.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import {
  generateDocuSealToken,
  createDocuSealSubmission,
  getDocuSealSubmission,
  mapFieldValues,
} from "@/lib/docuseal";

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

    // Get the submission with form template
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        formTemplate: {
          select: {
            id: true,
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
      // Generate a new token for the existing submission
      const token = await generateDocuSealToken({
        userEmail: session.user.email,
        submissionId: submission.docusealSubmissionId,
        expiresIn: "1h",
      });

      return NextResponse.json({
        success: true,
        submissionId: submission.docusealSubmissionId,
        token,
        docusealUrl: process.env.DOCUSEAL_URL || "http://localhost:3001",
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

    // Get user name for DocuSeal
    const userName = session.user.name || session.user.email.split("@")[0];

    // Create DocuSeal submission
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/docuseal`;

    const docusealResult = await createDocuSealSubmission({
      templateId: submission.formTemplate.docusealTemplateId,
      email: session.user.email,
      name: userName,
      fieldValues: docusealValues,
      externalId: submission.id,
      webhookUrl,
    });

    // Update submission with DocuSeal ID
    await prisma.submission.update({
      where: { id },
      data: {
        docusealSubmissionId: docusealResult.submissionId,
      },
    });

    // Generate token for embedding
    const token = await generateDocuSealToken({
      userEmail: session.user.email,
      submissionId: docusealResult.submissionId,
      expiresIn: "1h",
    });

    return NextResponse.json({
      success: true,
      submissionId: docusealResult.submissionId,
      token,
      docusealUrl: process.env.DOCUSEAL_URL || "http://localhost:3001",
    });
  } catch (error) {
    console.error("Create DocuSeal submission error:", error);
    return NextResponse.json(
      { error: "Failed to create PDF signing session" },
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
