/**
 * Provider Form QR Code Management API
 *
 * Manage individual QR codes (get details, deactivate, reactivate).
 *
 * GET /api/provider/forms/[id]/qr/[qrId] - Get QR code details with images
 * PATCH /api/provider/forms/[id]/qr/[qrId] - Update QR code (activate/deactivate)
 * DELETE /api/provider/forms/[id]/qr/[qrId] - Soft delete (deactivate) QR code
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { logAuditEvent } from "@/lib/audit-log";
import {
  generateQRCodeDataURL,
  generateQRCodeSVG,
  buildFormUrl,
} from "@/lib/qr-code";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; qrId: string }>;
}

// Helper to verify form and QR code ownership
async function verifyOwnership(userId: string, formId: string, qrId: string) {
  const membership = await prisma.member.findFirst({
    where: { userId },
    select: {
      organizationId: true,
      organization: {
        select: {
          id: true,
          name: true,
          logo: true,
        },
      },
    },
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

  const qrCode = await prisma.qRCode.findUnique({
    where: { id: qrId },
  });

  if (!qrCode) {
    return { error: "QR code not found", status: 404 };
  }

  if (qrCode.formTemplateId !== formId) {
    return { error: "QR code does not belong to this form", status: 400 };
  }

  return {
    organizationId: membership.organizationId,
    organization: membership.organization,
    formTitle: form.title,
    qrCode,
  };
}

// GET: Get QR code details with generated images
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, qrId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownership = await verifyOwnership(session.user.id, id, qrId);
    if ("error" in ownership) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.status }
      );
    }

    const { qrCode, formTitle, organization } = ownership;
    const formUrl = buildFormUrl(qrCode.shortCode);

    // Generate QR code images on demand
    const [qrImageDataUrl, qrImageSvg] = await Promise.all([
      generateQRCodeDataURL(formUrl, { width: 400 }),
      generateQRCodeSVG(formUrl, { width: 400 }),
    ]);

    return NextResponse.json({
      qrCode: {
        id: qrCode.id,
        shortCode: qrCode.shortCode,
        label: qrCode.label,
        formUrl,
        qrImageDataUrl,
        qrImageSvg,
        isActive: qrCode.isActive,
        scanCount: qrCode.scanCount,
        lastScannedAt: qrCode.lastScannedAt,
        createdAt: qrCode.createdAt,
        createdBy: qrCode.createdBy,
      },
      formTitle,
      organization: {
        id: organization.id,
        name: organization.name,
        logo: organization.logo,
      },
    });
  } catch (error) {
    console.error("Get QR code error:", error);
    return NextResponse.json(
      { error: "Failed to get QR code" },
      { status: 500 }
    );
  }
}

// PATCH: Update QR code (activate/deactivate)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, qrId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownership = await verifyOwnership(session.user.id, id, qrId);
    if ("error" in ownership) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.status }
      );
    }

    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive must be a boolean" },
        { status: 400 }
      );
    }

    const updatedQrCode = await prisma.qRCode.update({
      where: { id: qrId },
      data: { isActive },
    });

    // Log audit event
    await logAuditEvent({
      request,
      userId: session.user.id,
      organizationId: ownership.organizationId,
      action: isActive ? "ACTIVATE_QR_CODE" : "DEACTIVATE_QR_CODE",
      resourceType: "QRCode",
      resourceId: qrId,
      metadata: {
        formTemplateId: id,
        formTitle: ownership.formTitle,
        shortCode: updatedQrCode.shortCode,
      },
    });

    return NextResponse.json({
      qrCode: {
        id: updatedQrCode.id,
        shortCode: updatedQrCode.shortCode,
        formUrl: buildFormUrl(updatedQrCode.shortCode),
        isActive: updatedQrCode.isActive,
        updatedAt: updatedQrCode.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update QR code error:", error);
    return NextResponse.json(
      { error: "Failed to update QR code" },
      { status: 500 }
    );
  }
}

// DELETE: Soft delete (deactivate) QR code
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, qrId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownership = await verifyOwnership(session.user.id, id, qrId);
    if ("error" in ownership) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.status }
      );
    }

    // Soft delete - just deactivate
    const updatedQrCode = await prisma.qRCode.update({
      where: { id: qrId },
      data: { isActive: false },
    });

    // Log audit event
    await logAuditEvent({
      request,
      userId: session.user.id,
      organizationId: ownership.organizationId,
      action: "DEACTIVATE_QR_CODE",
      resourceType: "QRCode",
      resourceId: qrId,
      metadata: {
        formTemplateId: id,
        formTitle: ownership.formTitle,
        shortCode: updatedQrCode.shortCode,
      },
    });

    return NextResponse.json({
      success: true,
      message: "QR code deactivated",
    });
  } catch (error) {
    console.error("Delete QR code error:", error);
    return NextResponse.json(
      { error: "Failed to delete QR code" },
      { status: 500 }
    );
  }
}
