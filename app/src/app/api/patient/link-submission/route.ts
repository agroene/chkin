/**
 * Link Anonymous Submission API
 *
 * Links an anonymous form submission to the authenticated user's account
 * and syncs the submission data to their patient profile.
 *
 * POST /api/patient/link-submission
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
} from "@/lib/referral-doctors";

export const dynamic = "force-dynamic";

interface LinkBody {
  anonymousToken: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: LinkBody = await request.json();
    const { anonymousToken } = body;

    if (!anonymousToken) {
      return NextResponse.json(
        { error: "anonymousToken is required" },
        { status: 400 }
      );
    }

    // Find submission(s) with this anonymous token
    const submissions = await prisma.submission.findMany({
      where: {
        anonymousToken,
        userId: null, // Only unlinked submissions
      },
      orderBy: { createdAt: "desc" },
    });

    if (submissions.length === 0) {
      return NextResponse.json(
        { error: "No submissions found for this token" },
        { status: 404 }
      );
    }

    // Link all submissions to the user
    await prisma.submission.updateMany({
      where: {
        anonymousToken,
        userId: null,
      },
      data: {
        userId: session.user.id,
        anonymousToken: null, // Clear token after linking (one-time use)
      },
    });

    // Get the most recent submission's data to sync to profile
    const mostRecentSubmission = submissions[0];
    const submissionData = JSON.parse(mostRecentSubmission.data);

    // Get or create patient profile
    let profile = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
    });

    const existingData = profile?.data ? JSON.parse(profile.data) : {};

    // Merge submission data into profile (submission data takes precedence for new fields)
    // But don't overwrite existing profile values - user may have updated them
    const mergedData: Record<string, unknown> = { ...existingData };
    let newFieldsCount = 0;

    for (const [key, value] of Object.entries(submissionData)) {
      // Only add fields that don't exist in profile or are empty
      if (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        (mergedData[key] === undefined || mergedData[key] === null || mergedData[key] === "")
      ) {
        mergedData[key] = value;
        newFieldsCount++;
      }
    }

    // Handle referral doctor - add to saved doctors array if present in submission
    const doctorData = extractDoctorFromSubmission(submissionData);
    if (doctorData && doctorData.referralDoctorName) {
      const existingDoctors = getSavedDoctors(mergedData);
      const updatedDoctors = upsertDoctor(existingDoctors, doctorData);
      mergedData[SAVED_DOCTORS_FIELD] = updatedDoctors;
    }

    if (profile) {
      profile = await prisma.patientProfile.update({
        where: { userId: session.user.id },
        data: { data: JSON.stringify(mergedData) },
      });
    } else {
      profile = await prisma.patientProfile.create({
        data: {
          userId: session.user.id,
          data: JSON.stringify(mergedData),
        },
      });
    }

    // Log audit event
    await logAuditEvent({
      request,
      userId: session.user.id,
      action: "LINK_ANONYMOUS_SUBMISSION",
      resourceType: "Submission",
      resourceId: mostRecentSubmission.id,
      metadata: {
        submissionsLinked: submissions.length,
        newFieldsSynced: newFieldsCount,
        submissionIds: submissions.map((s) => s.id),
      },
    });

    return NextResponse.json({
      success: true,
      linked: {
        submissionCount: submissions.length,
        newFieldsSynced: newFieldsCount,
        mostRecentSubmissionId: mostRecentSubmission.id,
      },
      profile: {
        id: profile.id,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (error) {
    console.error("Link submission error:", error);
    return NextResponse.json(
      { error: "Failed to link submission" },
      { status: 500 }
    );
  }
}
