/**
 * Get Pending Provider Registration API
 *
 * Retrieves the pending provider registration data for the current user
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Verify user is authenticated
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", success: false },
        { status: 401 }
      );
    }

    // Fetch pending registration
    const pending = await prisma.pendingProviderRegistration.findUnique({
      where: { userId: session.user.id },
    });

    if (!pending) {
      return NextResponse.json(
        { error: "No pending registration found", success: false },
        { status: 404 }
      );
    }

    // Check if expired (24 hours)
    if (new Date() > pending.expiresAt) {
      await prisma.pendingProviderRegistration.delete({
        where: { userId: session.user.id },
      });

      return NextResponse.json(
        { error: "Registration expired. Please register again.", success: false },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        practiceName: pending.practiceName,
        practiceNumber: pending.practiceNumber,
        phone: pending.phone,
        industryType: pending.industryType,
        website: pending.website,
        complexName: pending.complexName,
        unitNumber: pending.unitNumber,
        streetAddress: pending.streetAddress || pending.address,
        suburb: pending.suburb,
        city: pending.city,
        province: pending.province,
        postalCode: pending.postalCode,
        country: pending.country,
      },
    });
  } catch (error) {
    console.error("Get pending registration error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve pending registration", success: false },
      { status: 500 }
    );
  }
}
