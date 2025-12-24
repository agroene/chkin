/**
 * Submission Data Export API
 *
 * Allows patients to download their submitted data in JSON format.
 * POPIA compliance: Right to data portability.
 *
 * GET /api/patient/submissions/[id]/export - Export submission data
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
        userId: session.user.id,
      },
      include: {
        formTemplate: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                industryType: true,
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

    // Parse submission data
    const submissionData = JSON.parse(submission.data);

    // Build export object with clear structure
    const exportData = {
      exportInfo: {
        exportedAt: new Date().toISOString(),
        exportedBy: session.user.email,
        format: "JSON",
        version: "1.0",
      },
      submission: {
        id: submission.id,
        submittedAt: submission.createdAt.toISOString(),
        status: submission.status,
      },
      consent: {
        given: submission.consentGiven,
        givenAt: submission.consentAt?.toISOString() || null,
        token: submission.consentToken,
        clause: submission.formTemplate.consentClause,
        withdrawnAt: submission.consentWithdrawnAt?.toISOString() || null,
        withdrawalReason: submission.withdrawalReason,
      },
      organization: {
        id: submission.formTemplate.organization.id,
        name: submission.formTemplate.organization.name,
        industryType: submission.formTemplate.organization.industryType,
      },
      form: {
        id: submission.formTemplate.id,
        title: submission.formTemplate.title,
        description: submission.formTemplate.description,
      },
      data: {} as Record<string, { label: string; value: unknown; category: string }>,
    };

    // Add all field values with labels
    for (const formField of submission.formTemplate.fields) {
      const fieldDef = formField.fieldDefinition;
      const value = submissionData[fieldDef.name];

      exportData.data[fieldDef.name] = {
        label: formField.labelOverride || fieldDef.label,
        value: value ?? null,
        category: fieldDef.category,
      };
    }

    // Log audit event
    await logAuditEvent({
      request,
      userId: session.user.id,
      action: "EXPORT_OWN_SUBMISSION",
      resourceType: "Submission",
      resourceId: submission.id,
      metadata: {
        formTitle: submission.formTemplate.title,
        organizationId: submission.organizationId,
        format: "JSON",
      },
    });

    // Return as downloadable JSON
    const filename = `chkin-export-${submission.id.slice(0, 8)}-${new Date().toISOString().split("T")[0]}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export submission error:", error);
    return NextResponse.json(
      { error: "Failed to export submission" },
      { status: 500 }
    );
  }
}
