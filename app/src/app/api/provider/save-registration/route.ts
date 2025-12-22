/**
 * Provider Registration API
 *
 * Creates the organization and owner membership immediately after user signup.
 * The organization is created with "pending" status awaiting admin approval.
 *
 * This approach ensures:
 * 1. User is immediately visible as a "Provider" in admin panel
 * 2. Admin can manually verify email if needed
 * 3. Organization shows in pending approval queue right away
 *
 * Note: This endpoint uses email-based lookup since the user is not yet
 * authenticated (autoSignIn is disabled until email verification).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Helper to create URL-friendly slug from practice name
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

export async function POST(request: NextRequest) {
  console.log("[save-registration] POST called");
  try {
    // Get registration data from request body
    const formData = await request.json();
    console.log("[save-registration] Form data received:", { email: formData.email, practiceName: formData.practiceName });
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

    // Check if user already has an organization membership
    const existingMembership = await prisma.member.findFirst({
      where: { userId: user.id },
    });

    if (existingMembership) {
      console.log("[save-registration] User already has membership, skipping");
      return NextResponse.json({ success: true, message: "Already registered" });
    }

    // Create unique slug for organization
    const baseSlug = createSlug(practiceName);
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: baseSlug },
    });
    const slug = existingOrg ? `${baseSlug}-${Date.now()}` : baseSlug;

    // Build full address string
    const addressParts = [
      unitNumber,
      complexName,
      address,
      suburb,
      city,
      province,
      postalCode,
    ].filter(Boolean);
    const fullAddress = addressParts.join(", ");

    // Create organization and membership in a transaction
    console.log("[save-registration] Creating organization:", practiceName);
    const organization = await prisma.organization.create({
      data: {
        name: practiceName,
        slug,
        status: "pending",
        practiceNumber: practiceNumber || null,
        phone,
        industryType,
        website: website || null,
        address: fullAddress,
        city,
        postalCode,
        members: {
          create: {
            userId: user.id,
            role: "owner",
          },
        },
      },
    });

    console.log("[save-registration] Organization created:", organization.id);
    console.log("[save-registration] Owner membership created for user:", user.id);

    return NextResponse.json({
      success: true,
      organizationId: organization.id,
    });
  } catch (error) {
    console.error("Save registration error:", error);
    return NextResponse.json(
      { error: "Failed to save registration" },
      { status: 500 }
    );
  }
}
