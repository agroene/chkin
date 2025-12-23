/**
 * Patient Avatar Upload API
 *
 * Upload and update patient profile photo.
 * Stores image as base64 data URL in user.image field.
 *
 * POST /api/patient/avatar - Upload new avatar
 * DELETE /api/patient/avatar - Remove avatar
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { logAuditEvent } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

// Max file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024;
// Allowed image types
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2MB." },
        { status: 400 }
      );
    }

    // Convert to base64 data URL
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Update user's image
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { image: dataUrl },
      select: { id: true, image: true },
    });

    // Log audit event
    await logAuditEvent({
      request,
      userId: session.user.id,
      action: "UPDATE_AVATAR",
      resourceType: "User",
      resourceId: session.user.id,
      metadata: {
        fileType: file.type,
        fileSize: file.size,
      },
    });

    return NextResponse.json({
      success: true,
      image: updatedUser.image,
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Remove user's image
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: null },
    });

    // Log audit event
    await logAuditEvent({
      request: null as unknown as NextRequest,
      userId: session.user.id,
      action: "REMOVE_AVATAR",
      resourceType: "User",
      resourceId: session.user.id,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Avatar delete error:", error);
    return NextResponse.json(
      { error: "Failed to remove avatar" },
      { status: 500 }
    );
  }
}
