/**
 * Provider Form QR Code API
 *
 * Generate and list QR codes for a form.
 *
 * GET /api/provider/forms/[id]/qr - List QR codes for form
 * POST /api/provider/forms/[id]/qr - Generate new QR code
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { logAuditEvent } from "@/lib/audit-log";
import {
  generateShortCode,
  generateQRCodeDataURL,
  generateQRCodeSVG,
  buildFormUrl,
} from "@/lib/qr-code";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper to verify form ownership
async function verifyFormOwnership(userId: string, formId: string) {
  const membership = await prisma.member.findFirst({
    where: { userId },
    select: { organizationId: true },
  });

  if (!membership) {
    return { error: "No organization found", status: 404 };
  }

  const form = await prisma.formTemplate.findUnique({
    where: { id: formId },
    select: { organizationId: true, title: true },
  });

  if (!form) {
    return { error: "Form not found", status: 404 };
  }

  if (form.organizationId !== membership.organizationId) {
    return { error: "Forbidden", status: 403 };
  }

  return { organizationId: membership.organizationId, formTitle: form.title };
}

// GET: List QR codes for a form
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownership = await verifyFormOwnership(session.user.id, id);
    if ("error" in ownership) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.status }
      );
    }

    // Get all QR codes for this form
    const qrCodes = await prisma.qRCode.findMany({
      where: { formTemplateId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        shortCode: true,
        isActive: true,
        createdAt: true,
        createdBy: true,
      },
    });

    // Add form URL to each QR code
    const qrCodesWithUrls = qrCodes.map((qr) => ({
      ...qr,
      formUrl: buildFormUrl(qr.shortCode),
    }));

    return NextResponse.json({
      qrCodes: qrCodesWithUrls,
      formTitle: ownership.formTitle,
    });
  } catch (error) {
    console.error("List QR codes error:", error);
    return NextResponse.json(
      { error: "Failed to list QR codes" },
      { status: 500 }
    );
  }
}

// POST: Generate new QR code for form
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownership = await verifyFormOwnership(session.user.id, id);
    if ("error" in ownership) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.status }
      );
    }

    // Generate unique short code (retry if collision)
    let shortCode: string;
    let attempts = 0;
    const maxAttempts = 5;

    do {
      shortCode = generateShortCode();
      const existing = await prisma.qRCode.findUnique({
        where: { shortCode },
      });
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: "Failed to generate unique short code" },
        { status: 500 }
      );
    }

    // Create QR code record
    const qrCode = await prisma.qRCode.create({
      data: {
        formTemplateId: id,
        shortCode,
        createdBy: session.user.id,
      },
    });

    // Generate QR code images
    const formUrl = buildFormUrl(shortCode);
    const [qrImageDataUrl, qrImageSvg] = await Promise.all([
      generateQRCodeDataURL(formUrl, { width: 300 }),
      generateQRCodeSVG(formUrl, { width: 300 }),
    ]);

    // Log audit event
    await logAuditEvent({
      request,
      userId: session.user.id,
      organizationId: ownership.organizationId,
      action: "CREATE_QR_CODE",
      resourceType: "QRCode",
      resourceId: qrCode.id,
      metadata: {
        formTemplateId: id,
        formTitle: ownership.formTitle,
        shortCode,
      },
    });

    return NextResponse.json({
      qrCode: {
        id: qrCode.id,
        shortCode: qrCode.shortCode,
        formUrl,
        qrImageDataUrl,
        qrImageSvg,
        isActive: qrCode.isActive,
        createdAt: qrCode.createdAt,
      },
    });
  } catch (error) {
    console.error("Generate QR code error:", error);
    return NextResponse.json(
      { error: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}
