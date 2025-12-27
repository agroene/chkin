/**
 * Patient Profile Sync API
 *
 * Sync specific fields from a submission to the patient's profile.
 *
 * POST /api/patient/profile/sync
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { logAuditEvent } from "@/lib/audit-log";
import {
  extractDoctorFromSubmission,
  getSavedDoctors,
  upsertDoctor,
  SAVED_DOCTORS_FIELD,
  REFERRAL_DOCTOR_FIELDS,
} from "@/lib/referral-doctors";

export const dynamic = "force-dynamic";

interface SyncBody {
  submissionId: string;
  fields: string[]; // Field names to sync
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SyncBody = await request.json();
    const { submissionId, fields } = body;

    if (!submissionId || !fields || !Array.isArray(fields)) {
      return NextResponse.json(
        { error: "submissionId and fields array are required" },
        { status: 400 }
      );
    }

    // Get the submission
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Verify ownership - submission must belong to this user
    if (submission.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Not authorized to sync this submission" },
        { status: 403 }
      );
    }

    // Parse submission data
    const submissionData = JSON.parse(submission.data);

    // Extract only the requested fields
    const updates: Record<string, unknown> = {};
    for (const fieldName of fields) {
      if (submissionData[fieldName] !== undefined) {
        updates[fieldName] = submissionData[fieldName];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        success: true,
        message: "No fields to sync",
        syncedFields: 0,
      });
    }

    // Get or create profile
    let profile = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
    });

    const existingData = profile?.data ? JSON.parse(profile.data) : {};
    const newData = { ...existingData, ...updates };

    // Check if any referral doctor fields are being synced
    const hasReferralDoctorFields = fields.some((f) =>
      REFERRAL_DOCTOR_FIELDS.includes(f as typeof REFERRAL_DOCTOR_FIELDS[number])
    );

    if (hasReferralDoctorFields) {
      // Extract doctor from submission and add to saved doctors
      const doctorData = extractDoctorFromSubmission(submissionData);
      if (doctorData && doctorData.referralDoctorName) {
        const existingDoctors = getSavedDoctors(newData);
        const updatedDoctors = upsertDoctor(existingDoctors, doctorData);
        newData[SAVED_DOCTORS_FIELD] = updatedDoctors;
      }
    }

    if (profile) {
      profile = await prisma.patientProfile.update({
        where: { userId: session.user.id },
        data: { data: JSON.stringify(newData) },
      });
    } else {
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
      action: "SYNC_PROFILE_FROM_SUBMISSION",
      resourceType: "PatientProfile",
      resourceId: profile.id,
      metadata: {
        submissionId,
        syncedFields: Object.keys(updates),
      },
    });

    return NextResponse.json({
      success: true,
      syncedFields: Object.keys(updates).length,
      profile: {
        id: profile.id,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (error) {
    console.error("Profile sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync profile" },
      { status: 500 }
    );
  }
}
