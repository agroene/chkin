/**
 * Complete Provider Registration API
 *
 * This endpoint is called after email verification to create the organization
 * using data stored in the PendingProviderRegistration table during the registration flow.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get registration data from request body
    const body = await request.json();
    const {
      practiceName,
      practiceNumber,
      phone,
      industryType,
      website,
      complexName,
      unitNumber,
      streetAddress,
      suburb,
      city,
      province,
      postalCode,
      country,
    } = body;

    if (!practiceName || !phone || !industryType || !streetAddress || !city || !postalCode) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user already has an organization (prevents duplicate registrations)
    const existingMembership = await prisma.member.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    });

    if (existingMembership) {
      // User already has an organization - return success with existing org
      return NextResponse.json({
        success: true,
        organizationId: existingMembership.organizationId,
        redirect: "/provider/pending",
      });
    }

    // Create slug from practice name with timestamp suffix for uniqueness
    const baseSlug = practiceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if slug exists and add suffix if needed
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: baseSlug },
    });
    const slug = existingOrg ? `${baseSlug}-${Date.now()}` : baseSlug;

    // Create organization with pending status
    const organization = await prisma.organization.create({
      data: {
        name: practiceName,
        slug: slug,
        status: "pending", // Requires admin approval
        practiceNumber,
        phone,
        industryType,
        website,
        complexName,
        unitNumber,
        streetAddress,
        suburb,
        city,
        province,
        postalCode,
        country: country || "South Africa",
      },
    });

    // Add user as owner of the organization
    await prisma.member.create({
      data: {
        userId: session.user.id,
        organizationId: organization.id,
        role: "owner",
      },
    });

    // Delete pending registration record (no longer needed)
    await prisma.pendingProviderRegistration.delete({
      where: { userId: session.user.id },
    }).catch(() => {
      // Ignore if doesn't exist
    });

    return NextResponse.json({
      success: true,
      organizationId: organization.id,
      redirect: "/provider/pending",
    });
  } catch (error) {
    console.error("Complete registration error:", error);
    return NextResponse.json(
      { error: "Failed to complete registration" },
      { status: 500 }
    );
  }
}
