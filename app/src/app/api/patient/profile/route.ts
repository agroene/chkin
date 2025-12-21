/**
 * Patient Profile API
 *
 * Manage patient profile data (get, update).
 *
 * GET /api/patient/profile - Get current profile
 * PATCH /api/patient/profile - Update profile fields
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { logAuditEvent } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

// GET: Get current patient profile
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({
        profile: null,
        data: {},
      });
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
      data: JSON.parse(profile.data),
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "Failed to get profile" },
      { status: 500 }
    );
  }
}

// PATCH: Update profile fields
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { updates } = body;

    if (!updates || typeof updates !== "object") {
      return NextResponse.json(
        { error: "Updates object is required" },
        { status: 400 }
      );
    }

    // Get existing profile or create empty
    let profile = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
    });

    const existingData = profile?.data ? JSON.parse(profile.data) : {};
    const newData = { ...existingData, ...updates };

    if (profile) {
      // Update existing profile
      profile = await prisma.patientProfile.update({
        where: { userId: session.user.id },
        data: { data: JSON.stringify(newData) },
      });
    } else {
      // Create new profile
      profile = await prisma.patientProfile.create({
        data: {
          userId: session.user.id,
          data: JSON.stringify(newData),
        },
      });
    }

    // Log audit event
    await logAuditEvent({
      request,
      userId: session.user.id,
      action: "UPDATE_PATIENT_PROFILE",
      resourceType: "PatientProfile",
      resourceId: profile.id,
      metadata: {
        updatedFields: Object.keys(updates),
      },
    });

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        updatedAt: profile.updatedAt,
      },
      data: newData,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
