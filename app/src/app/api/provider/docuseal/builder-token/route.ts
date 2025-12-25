/**
 * DocuSeal Builder Token API
 *
 * POST /api/provider/docuseal/builder-token
 * Returns a JWT token for embedding the DocuSeal Builder component.
 *
 * Body:
 * - templateId?: number (optional, for editing existing template)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { generateDocuSealToken } from "@/lib/docuseal";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user's organization membership
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

    // Only approved organizations can use DocuSeal
    if (membership.organization.status !== "approved") {
      return NextResponse.json(
        { error: "Organization must be approved to use PDF signing" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { templateId } = body;

    // Generate JWT token for the builder
    const token = await generateDocuSealToken({
      userEmail: session.user.email,
      templateId: templateId ? Number(templateId) : undefined,
      expiresIn: "2h", // Builder sessions can be longer
    });

    return NextResponse.json({
      success: true,
      token,
      docusealUrl: process.env.DOCUSEAL_URL || "http://localhost:3001",
    });
  } catch (error) {
    console.error("DocuSeal builder token error:", error);
    return NextResponse.json(
      { error: "Failed to generate builder token" },
      { status: 500 }
    );
  }
}
