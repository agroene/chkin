/**
 * Save Pending Provider Registration API
 *
 * Stores provider registration data in the database after user signup
 * but before email verification. Data is retrieved when user verifies email.
 *
 * Note: This endpoint uses email-based lookup since the user is not yet
 * authenticated (autoSignIn is disabled until email verification).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Get registration data from request body
    const formData = await request.json();
    const {
      email,
      practiceName,
      practiceNumber,
      phone,
      industryType,
      website,
      // Address fields
      complexName,
      unitNumber,
      address,        // streetAddress from form
      suburb,
      city,
      province,
      postalCode,
    } = formData;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!practiceName || !phone || !industryType || !address || !city || !postalCode) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find the user by email (they should have just signed up)
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Save or update pending registration
    await prisma.pendingProviderRegistration.upsert({
      where: { userId: user.id },
      update: {
        practiceName,
        practiceNumber,
        phone,
        industryType,
        website,
        complexName,
        unitNumber,
        streetAddress: address,
        suburb,
        city,
        province,
        postalCode,
        address, // Keep for backwards compat
      },
      create: {
        userId: user.id,
        practiceName,
        practiceNumber,
        phone,
        industryType,
        website,
        complexName,
        unitNumber,
        streetAddress: address,
        suburb,
        city,
        province,
        postalCode,
        address, // Keep for backwards compat
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save registration error:", error);
    return NextResponse.json(
      { error: "Failed to save registration" },
      { status: 500 }
    );
  }
}
