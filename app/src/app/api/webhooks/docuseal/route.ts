/**
 * DocuSeal Webhook Handler
 *
 * POST /api/webhooks/docuseal
 * Handles webhook callbacks from DocuSeal when documents are signed.
 *
 * DocuSeal sends events like:
 * - form.completed - When a form submission is completed
 * - form.viewed - When a form is opened
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyDocuSealWebhook } from "@/lib/docuseal";

export const dynamic = "force-dynamic";

interface DocuSealWebhookPayload {
  event_type: string;
  timestamp: string;
  data: {
    id: number;
    submission_id: number;
    email: string;
    status: string;
    completed_at?: string;
    documents?: Array<{
      name: string;
      url: string;
    }>;
    external_id?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Verify webhook signature
    const signature = request.headers.get("x-docuseal-signature") || "";

    if (process.env.NODE_ENV === "production") {
      const isValid = verifyDocuSealWebhook(rawBody, signature);
      if (!isValid) {
        console.error("DocuSeal webhook signature verification failed");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    // Parse payload
    let payload: DocuSealWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    console.log("DocuSeal webhook received:", payload.event_type, payload.data);

    // Handle different event types
    switch (payload.event_type) {
      case "form.completed":
        await handleFormCompleted(payload);
        break;

      case "form.viewed":
        // Optional: Track when form is opened
        console.log("Form viewed:", payload.data.submission_id);
        break;

      default:
        console.log("Unhandled DocuSeal event:", payload.event_type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("DocuSeal webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleFormCompleted(payload: DocuSealWebhookPayload) {
  const { submission_id, completed_at, documents, external_id } = payload.data;

  // Find the Chkin submission by external_id (our submission ID) or docusealSubmissionId
  let submission;

  if (external_id) {
    submission = await prisma.submission.findUnique({
      where: { id: external_id },
    });
  }

  if (!submission) {
    // Try to find by DocuSeal submission ID
    submission = await prisma.submission.findFirst({
      where: { docusealSubmissionId: submission_id },
    });
  }

  if (!submission) {
    console.error(
      "Could not find Chkin submission for DocuSeal submission:",
      submission_id
    );
    return;
  }

  // Update submission with signed document info
  const signedUrl = documents?.[0]?.url || null;

  await prisma.submission.update({
    where: { id: submission.id },
    data: {
      signedAt: completed_at ? new Date(completed_at) : new Date(),
      signedDocumentUrl: signedUrl,
      status: "completed",
    },
  });

  console.log("Updated submission with signed document:", submission.id);
}
