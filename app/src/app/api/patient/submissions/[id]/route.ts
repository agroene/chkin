/**
 * Patient Submission Detail API
 *
 * Returns full details of a specific submission including all data.
 * Also supports consent withdrawal.
 *
 * GET /api/patient/submissions/[id] - Get submission details
 * POST /api/patient/submissions/[id] - Withdraw consent
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { logAuditEvent } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET - Get submission details
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Get submission with full details
    const submission = await prisma.submission.findFirst({
      where: {
        id,
        userId: session.user.id, // Ensure user owns this submission
      },
      include: {
        formTemplate: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                logo: true,
                industryType: true,
                phone: true,
                streetAddress: true,
                city: true,
                province: true,
              },
            },
            fields: {
              include: {
                fieldDefinition: true,
              },
              orderBy: { sortOrder: "asc" },
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

    // Parse the submission data
    const submissionData = JSON.parse(submission.data);

    // Build field list with values, organized by section
    const fields: Array<{
      name: string;
      label: string;
      value: unknown;
      fieldType: string;
      section: string | null;
      specialPersonalInfo: boolean;
    }> = [];

    for (const formField of submission.formTemplate.fields) {
      const fieldDef = formField.fieldDefinition;
      const value = submissionData[fieldDef.name];

      fields.push({
        name: fieldDef.name,
        label: formField.labelOverride || fieldDef.label,
        value: value ?? null,
        fieldType: fieldDef.fieldType,
        section: formField.section,
        specialPersonalInfo: fieldDef.specialPersonalInfo,
      });
    }

    // Log audit event for viewing submission
    await logAuditEvent({
      request,
      userId: session.user.id,
      action: "VIEW_OWN_SUBMISSION",
      resourceType: "Submission",
      resourceId: submission.id,
      metadata: {
        formTitle: submission.formTemplate.title,
        organizationId: submission.organizationId,
      },
    });

    return NextResponse.json({
      id: submission.id,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      status: submission.status,
      // Consent info
      consent: {
        given: submission.consentGiven,
        givenAt: submission.consentAt,
        token: submission.consentToken,
        clause: submission.formTemplate.consentClause,
        withdrawnAt: submission.consentWithdrawnAt,
        withdrawalReason: submission.withdrawalReason,
        isActive: submission.consentGiven && !submission.consentWithdrawnAt,
      },
      // Form info
      form: {
        id: submission.formTemplate.id,
        title: submission.formTemplate.title,
        description: submission.formTemplate.description,
      },
      // Organization info
      organization: submission.formTemplate.organization,
      // All submitted fields with values
      fields,
      // Raw field count
      fieldCount: fields.length,
    });
  } catch (error) {
    console.error("Get submission detail error:", error);
    return NextResponse.json(
      { error: "Failed to get submission" },
      { status: 500 }
    );
  }
}

// POST - Withdraw consent
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { action, reason } = body;

    if (action !== "withdraw_consent") {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    // Get submission and verify ownership
    const submission = await prisma.submission.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        formTemplate: {
          include: {
            organization: {
              select: { name: true },
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

    // Check if consent was given
    if (!submission.consentGiven) {
      return NextResponse.json(
        { error: "No consent to withdraw" },
        { status: 400 }
      );
    }

    // Check if already withdrawn
    if (submission.consentWithdrawnAt) {
      return NextResponse.json(
        { error: "Consent already withdrawn" },
        { status: 400 }
      );
    }

    // Withdraw consent
    const updatedSubmission = await prisma.submission.update({
      where: { id },
      data: {
        consentWithdrawnAt: new Date(),
        withdrawalReason: reason || null,
      },
    });

    // Log audit event
    await logAuditEvent({
      request,
      userId: session.user.id,
      organizationId: submission.organizationId,
      action: "WITHDRAW_CONSENT",
      resourceType: "Submission",
      resourceId: submission.id,
      metadata: {
        formTitle: submission.formTemplate.title,
        organizationName: submission.formTemplate.organization.name,
        reason: reason || "No reason provided",
        originalConsentAt: submission.consentAt?.toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Consent withdrawn successfully",
      withdrawnAt: updatedSubmission.consentWithdrawnAt,
    });
  } catch (error) {
    console.error("Withdraw consent error:", error);
    return NextResponse.json(
      { error: "Failed to withdraw consent" },
      { status: 500 }
    );
  }
}
