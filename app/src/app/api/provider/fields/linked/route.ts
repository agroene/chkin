/**
 * Linked Fields API
 *
 * Returns field definitions that are linked to a parent field (e.g., address sub-fields).
 * Each address type has its own prefixed sub-fields in the database.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";

// Mapping of address field names to their linked sub-field names
// Each address type has prefixed sub-fields in the database
const ADDRESS_LINKED_FIELDS_MAP: Record<string, string[]> = {
  // Primary street address (patient's residential address)
  streetAddress: [
    "complexName",
    "unitNumber",
    "suburb",
    "city",
    "stateProvince",
    "postalCode",
    "country",
  ],
  // Postal address (if different from residential)
  postalStreetAddress: [
    "postalComplexName",
    "postalUnitNumber",
    "postalSuburb",
    "postalCity",
    "postalProvince",
    "postalPostalCode",
    "postalCountry",
  ],
  // Responsible party (guardian/parent) address
  responsiblePartyStreetAddress: [
    "responsiblePartyAddressComplexName",
    "responsiblePartyAddressUnitNumber",
    "responsiblePartyAddressSuburb",
    "responsiblePartyAddressCity",
    "responsiblePartyAddressProvince",
    "responsiblePartyAddressPostalCode",
    "responsiblePartyAddressCountry",
  ],
  // Emergency contact address
  emergencyContactStreetAddress: [
    "emergencyContactAddressComplexName",
    "emergencyContactAddressUnitNumber",
    "emergencyContactAddressSuburb",
    "emergencyContactAddressCity",
    "emergencyContactAddressProvince",
    "emergencyContactAddressPostalCode",
    "emergencyContactAddressCountry",
  ],
  // Billing address
  billingStreetAddress: [
    "billingAddressComplexName",
    "billingAddressUnitNumber",
    "billingAddressSuburb",
    "billingAddressCity",
    "billingAddressProvince",
    "billingAddressPostalCode",
    "billingAddressCountry",
  ],
};

// Default for unknown address types
const DEFAULT_LINKED_FIELD_NAMES = [
  "complexName",
  "unitNumber",
  "suburb",
  "city",
  "stateProvince",
  "postalCode",
  "country",
];

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parentFieldId = searchParams.get("parentFieldId");

    if (!parentFieldId) {
      return NextResponse.json(
        { error: "parentFieldId is required" },
        { status: 400 }
      );
    }

    // Get the parent field to check its config
    const parentField = await prisma.fieldDefinition.findUnique({
      where: { id: parentFieldId },
    });

    if (!parentField) {
      return NextResponse.json(
        { error: "Parent field not found" },
        { status: 404 }
      );
    }

    // Only address type fields have linked fields
    if (parentField.fieldType !== "address") {
      return NextResponse.json({ linkedFields: [] });
    }

    // Determine linked field names based on parent field name
    // First check config for custom mapping, then use predefined mapping, then default
    let linkedFieldNames: string[] = [];

    if (parentField.config) {
      try {
        const config = JSON.parse(parentField.config);
        if (config.linkedFields) {
          // Get the field names from the linkedFields mapping values
          linkedFieldNames = Object.values(config.linkedFields) as string[];
        }
      } catch {
        // Use mapping if config parsing fails
      }
    }

    // If no config-specified fields, use the mapping based on parent field name
    if (linkedFieldNames.length === 0) {
      linkedFieldNames = ADDRESS_LINKED_FIELDS_MAP[parentField.name] || DEFAULT_LINKED_FIELD_NAMES;
    }

    // Fetch the linked field definitions
    const linkedFields = await prisma.fieldDefinition.findMany({
      where: {
        name: { in: linkedFieldNames },
        isActive: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({
      parentField: {
        id: parentField.id,
        name: parentField.name,
        label: parentField.label,
        fieldType: parentField.fieldType,
      },
      linkedFields: linkedFields.map((f) => ({
        id: f.id,
        name: f.name,
        label: f.label,
        description: f.description,
        fieldType: f.fieldType,
        config: f.config,
        category: f.category,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch linked fields:", error);
    return NextResponse.json(
      { error: "Failed to fetch linked fields" },
      { status: 500 }
    );
  }
}
