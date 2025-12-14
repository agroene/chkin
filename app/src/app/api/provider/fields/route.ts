/**
 * Provider Field Library API
 *
 * Browse field definitions for form building.
 * Only returns active fields - providers can't manage the field library.
 *
 * GET /api/provider/fields
 * Query params:
 *   - category: string (filter by category)
 *   - search: string (searches name, label, description)
 *   - fieldType: string (filter by field type)
 *   - page: number (default: 1)
 *   - limit: number (default: 50, max: 200)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    // Verify user has a provider organization
    const membership = await prisma.member.findFirst({
      where: { userId: session.user.id },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const fieldType = searchParams.get("fieldType");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const skip = (page - 1) * limit;

    // Build where clause - only active fields for providers
    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (category) {
      where.category = category;
    }

    if (fieldType) {
      where.fieldType = fieldType;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { label: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get fields with pagination
    const [fields, total] = await Promise.all([
      prisma.fieldDefinition.findMany({
        where,
        select: {
          id: true,
          name: true,
          label: true,
          description: true,
          fieldType: true,
          config: true,
          category: true,
          sortOrder: true,
          specialPersonalInfo: true,
          requiresExplicitConsent: true,
        },
        orderBy: [
          { category: "asc" },
          { sortOrder: "asc" },
          { label: "asc" },
        ],
        skip,
        take: limit,
      }),
      prisma.fieldDefinition.count({ where }),
    ]);

    return NextResponse.json({
      fields,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List fields error:", error);
    return NextResponse.json(
      { error: "Failed to list fields" },
      { status: 500 }
    );
  }
}
