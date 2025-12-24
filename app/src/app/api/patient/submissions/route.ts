/**
 * Patient Submissions API
 *
 * Returns all form submissions for the authenticated patient.
 * Includes form template info, organization, consent status.
 *
 * GET /api/patient/submissions - List all submissions
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all submissions for this user
    const submissions = await prisma.submission.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        formTemplateId: true,
        organizationId: true,
        data: true,
        consentGiven: true,
        consentAt: true,
        consentToken: true,
        consentWithdrawnAt: true,
        withdrawalReason: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        formTemplate: {
          select: {
            id: true,
            title: true,
            description: true,
            consentClause: true,
            organization: {
              select: {
                id: true,
                name: true,
                logo: true,
                industryType: true,
              },
            },
          },
        },
      },
    });

    // Transform submissions to include parsed data and organization info
    const transformedSubmissions = submissions.map((submission) => {
      const parsedData = JSON.parse(submission.data);

      // Get a preview of the submitted data (first few key fields)
      const preview: Record<string, string> = {};
      const previewFields = ["firstName", "lastName", "dateOfBirth", "email", "phone"];
      for (const field of previewFields) {
        if (parsedData[field]) {
          preview[field] = parsedData[field];
        }
      }

      return {
        id: submission.id,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
        status: submission.status,
        // Consent info
        consent: {
          given: submission.consentGiven,
          givenAt: submission.consentAt,
          token: submission.consentToken,
          withdrawnAt: submission.consentWithdrawnAt,
          withdrawalReason: submission.withdrawalReason,
          isActive: submission.consentGiven && !submission.consentWithdrawnAt,
        },
        // Form info
        form: {
          id: submission.formTemplate.id,
          title: submission.formTemplate.title,
          description: submission.formTemplate.description,
          consentClause: submission.formTemplate.consentClause,
        },
        // Organization info
        organization: submission.formTemplate.organization,
        // Data preview (not full data - that's on detail view)
        preview,
        // Field count
        fieldCount: Object.keys(parsedData).length,
      };
    });

    return NextResponse.json({
      submissions: transformedSubmissions,
      total: transformedSubmissions.length,
    });
  } catch (error) {
    console.error("Get patient submissions error:", error);
    return NextResponse.json(
      { error: "Failed to get submissions" },
      { status: 500 }
    );
  }
}
