/**
 * DocuSeal Template Fields API
 *
 * GET /api/provider/docuseal/template-fields?templateId=123
 * Fetches the fields from a DocuSeal template for field mapping.
 * Works without requiring a saved form (for new form creation).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { getDocuSealTemplateFields } from "@/lib/docuseal";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user belongs to an approved organization
    const membership = await prisma.member.findFirst({
      where: { userId: session.user.id },
      include: {
        organization: {
          select: { id: true, status: true },
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    if (membership.organization.status !== "approved") {
      return NextResponse.json(
        { error: "Organization must be approved to use PDF signing" },
        { status: 403 }
      );
    }

    // Get template ID from query params
    const searchParams = request.nextUrl.searchParams;
    const templateIdParam = searchParams.get("templateId");

    if (!templateIdParam) {
      return NextResponse.json(
        { error: "templateId is required" },
        { status: 400 }
      );
    }

    const templateId = parseInt(templateIdParam, 10);
    if (isNaN(templateId) || templateId <= 0) {
      return NextResponse.json(
        { error: "templateId must be a positive number" },
        { status: 400 }
      );
    }

    // Fetch fields from DocuSeal
    try {
      const fields = await getDocuSealTemplateFields(templateId);

      return NextResponse.json({
        success: true,
        templateId,
        fields,
      });
    } catch (error) {
      console.error("Failed to fetch DocuSeal template fields:", error);
      return NextResponse.json(
        { error: "Failed to fetch template fields. Check if the template ID is correct and DocuSeal is running." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("DocuSeal template fields error:", error);
    return NextResponse.json(
      { error: "Failed to fetch template fields" },
      { status: 500 }
    );
  }
}
