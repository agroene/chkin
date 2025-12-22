/**
 * Test Form Template Seed Script (Auto-generated)
 *
 * Recreates the "Patient Registration Form" form for testing.
 * Run with: npx tsx prisma/seed-test-form.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const FORM_CONFIG = {
  title: "Patient Registration Form",
  description: "Patient on-boarding form for the Winelands Knee Clinic",
  consentClause: `- I understand that I am personally responsible for the settlement of my orthopaedic account. I also agree to take full responsibility for any legal or other costs encountered in receiving payment of my account.

- That I authorise and give consent to the Practice, the staff or agent of the Practice, which may include the practice management services of a contracted third party, to present for payment all the relevant details and personal information, on my behalf to the medical scheme, managed health care organisa􀆟on or insurer, owed to the Practice. That this information will include a diagnostic code (ICD-10) or other details relating to the treatment. Notwithstanding the aforesaid, I acknowledge that it remains my duty to ensure that all accounts are received by the medical scheme timeously.

- That the practice will regard my information as confidential in relation to my healthcare, however, may need to disclose this to other healthcare providers with regards to my treatment to which I consent.

- That if the account is not paid / short paid, for whatsoever reason, I will settle this within 30 calendar days. Should this account be overdue I understand that should I still not settle the account upon receipt of a final notice / demand that the practice may undertake the debt collection process and that I will be responsible for the costs or legal fees relating to this collection, which may also include interest. I consent that should this be the case, my personal information may be given to the debt collection agency / attorneys.`,
};

// Form field interface for type safety
interface FormFieldConfig {
  fieldName: string;
  isRequired: boolean;
  sortOrder: number;
  section: string;
  columnSpan: number;
  labelOverride?: string;
  helpText?: string;
  visibilityRules?: string;
}

// Form fields configuration - maps field names to their form-specific settings
const FORM_FIELDS: FormFieldConfig[] = [
  {
    fieldName: "title",
    isRequired: false,
    sortOrder: 0,
    section: "Patient Details",
    columnSpan: 1,
  },
  {
    fieldName: "firstName",
    isRequired: false,
    sortOrder: 1,
    section: "Patient Details",
    columnSpan: 3,
  },
  {
    fieldName: "lastName",
    isRequired: false,
    sortOrder: 2,
    section: "Patient Details",
    columnSpan: 4,
  },
  {
    fieldName: "dateOfBirth",
    isRequired: false,
    sortOrder: 3,
    section: "Patient Details",
    columnSpan: 2,
  },
  {
    fieldName: "gender",
    isRequired: false,
    sortOrder: 4,
    section: "Patient Details",
    columnSpan: 2,
  },
  {
    fieldName: "maritalStatus",
    isRequired: false,
    sortOrder: 5,
    section: "Patient Details",
    columnSpan: 2,
  },
  {
    fieldName: "homeLanguage",
    isRequired: false,
    sortOrder: 6,
    section: "Patient Details",
    columnSpan: 2,
  },
  {
    fieldName: "phoneHome",
    isRequired: false,
    sortOrder: 7,
    section: "Patient Details",
    columnSpan: 4,
  },
  {
    fieldName: "phoneWork",
    isRequired: false,
    sortOrder: 8,
    section: "Patient Details",
    columnSpan: 4,
  },
  {
    fieldName: "phoneMobile",
    isRequired: false,
    sortOrder: 9,
    section: "Patient Details",
    columnSpan: 4,
  },
  {
    fieldName: "emailPersonal",
    isRequired: false,
    sortOrder: 10,
    section: "Patient Details",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyRelationship",
    labelOverride: "Relationship to Patient",
    isRequired: false,
    sortOrder: 11,
    section: "Person Responsible for Account",
    columnSpan: 8,
  },
  {
    fieldName: "responsiblePartyName",
    labelOverride: "Full Name",
    isRequired: false,
    sortOrder: 12,
    section: "Person Responsible for Account",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyPhone",
    labelOverride: "Mobile Number",
    isRequired: false,
    sortOrder: 13,
    section: "Person Responsible for Account",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyStreetAddress",
    labelOverride: "Home Street Address",
    helpText: "Start typing to search for an address",
    isRequired: false,
    sortOrder: 14,
    section: "Person Responsible for Account",
    columnSpan: 8,
  },
  {
    fieldName: "responsiblePartyComplexName",
    labelOverride: "Home Building/Complex",
    isRequired: false,
    sortOrder: 15,
    section: "Person Responsible for Account",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyUnitNumber",
    labelOverride: "Home Unit/Suite",
    isRequired: false,
    sortOrder: 16,
    section: "Person Responsible for Account",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyAddressSuburb",
    labelOverride: "Home Suburb",
    isRequired: false,
    sortOrder: 17,
    section: "Person Responsible for Account",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyAddressCity",
    labelOverride: "Home City",
    isRequired: false,
    sortOrder: 18,
    section: "Person Responsible for Account",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyAddressProvince",
    labelOverride: "Home Province",
    isRequired: false,
    sortOrder: 19,
    section: "Person Responsible for Account",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyAddressPostalCode",
    labelOverride: "Home Postal Code",
    isRequired: false,
    sortOrder: 20,
    section: "Person Responsible for Account",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyAddressCountry",
    labelOverride: "Home Country",
    isRequired: false,
    sortOrder: 21,
    section: "Person Responsible for Account",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyPostalAddress",
    labelOverride: "Postal Street Address",
    helpText: "Start typing to search for an address",
    isRequired: false,
    sortOrder: 22,
    section: "Person Responsible for Account",
    columnSpan: 8,
  },
  {
    fieldName: "responsiblePartyPostalAddressComplexName",
    labelOverride: "Postal Building/Complex",
    isRequired: false,
    sortOrder: 23,
    section: "Person Responsible for Account",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyPostalAddressUnitNumber",
    labelOverride: "Postal Unit/Suite",
    isRequired: false,
    sortOrder: 24,
    section: "Person Responsible for Account",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyPostalAddressSuburb",
    labelOverride: "Postal Suburb",
    isRequired: false,
    sortOrder: 25,
    section: "Person Responsible for Account",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyPostalAddressCity",
    labelOverride: "Postal City",
    isRequired: false,
    sortOrder: 26,
    section: "Person Responsible for Account",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyPostalAddressProvince",
    labelOverride: "Postal Province",
    isRequired: false,
    sortOrder: 27,
    section: "Person Responsible for Account",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyPostalAddressPostalCode",
    labelOverride: "Postal Postal Code",
    isRequired: false,
    sortOrder: 28,
    section: "Person Responsible for Account",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyPostalAddressCountry",
    labelOverride: "Postal Country",
    isRequired: false,
    sortOrder: 29,
    section: "Person Responsible for Account",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyWorkAddress",
    labelOverride: "Work Street Address",
    helpText: "Start typing to search for an address",
    isRequired: false,
    sortOrder: 30,
    section: "Person Responsible for Account",
    columnSpan: 8,
  },
  {
    fieldName: "responsiblePartyWorkAddressComplexName",
    labelOverride: "Work Building/Complex",
    isRequired: false,
    sortOrder: 31,
    section: "Person Responsible for Account",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyWorkAddressUnitNumber",
    labelOverride: "Work Unit/Suite",
    isRequired: false,
    sortOrder: 32,
    section: "Person Responsible for Account",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyWorkAddressSuburb",
    labelOverride: "Work Suburb",
    isRequired: false,
    sortOrder: 33,
    section: "Person Responsible for Account",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyWorkAddressCity",
    labelOverride: "Work City",
    isRequired: false,
    sortOrder: 34,
    section: "Person Responsible for Account",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyWorkAddressProvince",
    labelOverride: "Work Province",
    isRequired: false,
    sortOrder: 35,
    section: "Person Responsible for Account",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyWorkAddressPostalCode",
    labelOverride: "Work Postal Code",
    isRequired: false,
    sortOrder: 36,
    section: "Person Responsible for Account",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyWorkAddressCountry",
    labelOverride: "Work Country",
    isRequired: false,
    sortOrder: 37,
    section: "Person Responsible for Account",
    columnSpan: 4,
  },
  {
    fieldName: "responsiblePartyEmail",
    labelOverride: "Primary Email",
    isRequired: false,
    sortOrder: 38,
    section: "Person Responsible for Account",
    columnSpan: 8,
  },
  {
    fieldName: "referralDoctor",
    isRequired: false,
    sortOrder: 39,
    section: "Referral Details",
    columnSpan: 8,
  },
  {
    fieldName: "emergencyContactRelationship",
    isRequired: false,
    sortOrder: 40,
    section: "Next of Kin",
    columnSpan: 8,
  },
  {
    fieldName: "emergencyContactName",
    labelOverride: "Full Name",
    isRequired: false,
    sortOrder: 41,
    section: "Next of Kin",
    columnSpan: 4,
  },
  {
    fieldName: "emergencyContactPhone",
    labelOverride: "Primary Phone Number",
    isRequired: false,
    sortOrder: 42,
    section: "Next of Kin",
    columnSpan: 4,
  },
  {
    fieldName: "emergencyContactEmail",
    labelOverride: "Primary Email",
    isRequired: false,
    sortOrder: 43,
    section: "Next of Kin",
    columnSpan: 8,
  },
  {
    fieldName: "emergencyContactStreetAddress",
    labelOverride: "Street Address",
    helpText: "Start typing to search for an address",
    isRequired: false,
    sortOrder: 44,
    section: "Next of Kin",
    columnSpan: 8,
  },
  {
    fieldName: "emergencyContactComplexName",
    labelOverride: "Building/Complex",
    isRequired: false,
    sortOrder: 45,
    section: "Next of Kin",
    columnSpan: 4,
  },
  {
    fieldName: "emergencyContactUnitNumber",
    labelOverride: "Unit/Suite",
    isRequired: false,
    sortOrder: 46,
    section: "Next of Kin",
    columnSpan: 4,
  },
  {
    fieldName: "emergencyContactAddressSuburb",
    labelOverride: "Suburb",
    isRequired: false,
    sortOrder: 47,
    section: "Next of Kin",
    columnSpan: 4,
  },
  {
    fieldName: "emergencyContactAddressCity",
    labelOverride: "City",
    isRequired: false,
    sortOrder: 48,
    section: "Next of Kin",
    columnSpan: 4,
  },
  {
    fieldName: "emergencyContactAddressProvince",
    labelOverride: "Province",
    isRequired: false,
    sortOrder: 49,
    section: "Next of Kin",
    columnSpan: 4,
  },
  {
    fieldName: "emergencyContactAddressPostalCode",
    labelOverride: "Postal Code",
    isRequired: false,
    sortOrder: 50,
    section: "Next of Kin",
    columnSpan: 4,
  },
  {
    fieldName: "emergencyContactAddressCountry",
    labelOverride: "Country",
    isRequired: false,
    sortOrder: 51,
    section: "Next of Kin",
    columnSpan: 4,
  },
  {
    fieldName: "medicalAidName",
    isRequired: false,
    sortOrder: 52,
    section: "Medical Aid",
    columnSpan: 4,
  },
  {
    fieldName: "medicalAidPlan",
    isRequired: false,
    sortOrder: 53,
    section: "Medical Aid",
    columnSpan: 4,
  },
  {
    fieldName: "medicalAidNumber",
    isRequired: false,
    sortOrder: 54,
    section: "Medical Aid",
    columnSpan: 4,
  },
  {
    fieldName: "medicalAidMainMember",
    isRequired: false,
    sortOrder: 55,
    section: "Medical Aid",
    columnSpan: 4,
  },
  {
    fieldName: "mainMemberId",
    isRequired: false,
    sortOrder: 56,
    section: "Medical Aid",
    columnSpan: 4,
  },
  {
    fieldName: "dependentCode",
    isRequired: false,
    sortOrder: 57,
    section: "Medical Aid",
    columnSpan: 2,
  },
  {
    fieldName: "gapCover",
    isRequired: false,
    sortOrder: 58,
    section: "Medical Aid",
    columnSpan: 2,
  },
];

async function seedTestForm() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // Find the test organization (or the first provider organization)
    const org = await prisma.organization.findFirst({
      where: { status: "approved" },
      orderBy: { createdAt: "asc" },
    });

    if (!org) {
      console.error("No approved organization found. Please create one first.");
      process.exit(1);
    }

    console.log(`Using organization: ${org.name} (${org.slug})`);

    // Check if form already exists
    const existingForm = await prisma.formTemplate.findFirst({
      where: {
        organizationId: org.id,
        title: FORM_CONFIG.title,
      },
    });

    if (existingForm) {
      console.log("Form already exists. Deleting and recreating...");
      // Delete existing form fields first
      await prisma.formField.deleteMany({
        where: { formTemplateId: existingForm.id },
      });
      await prisma.formTemplate.delete({
        where: { id: existingForm.id },
      });
    }

    // Get all field definitions we need
    const fieldNames = FORM_FIELDS.map(f => f.fieldName);
    const fieldDefs = await prisma.fieldDefinition.findMany({
      where: { name: { in: fieldNames } },
    });

    const fieldDefMap = new Map(fieldDefs.map(f => [f.name, f]));

    // Check for missing fields
    const missingFields = fieldNames.filter(name => !fieldDefMap.has(name));
    if (missingFields.length > 0) {
      console.warn(`Warning: Missing field definitions: ${missingFields.join(", ")}`);
      console.warn("Run the field seed script first: npx tsx prisma/seed-fields.ts");
    }

    // Create the form template with all fields
    const form = await prisma.formTemplate.create({
      data: {
        organizationId: org.id,
        title: FORM_CONFIG.title,
        description: FORM_CONFIG.description,
        consentClause: FORM_CONFIG.consentClause,
        isActive: true,
        version: 1,
        fields: {
          create: FORM_FIELDS
            .filter(f => fieldDefMap.has(f.fieldName))
            .map(f => ({
              fieldDefinitionId: fieldDefMap.get(f.fieldName)!.id,
              labelOverride: f.labelOverride || null,
              helpText: f.helpText || null,
              isRequired: f.isRequired,
              sortOrder: f.sortOrder,
              section: f.section,
              columnSpan: f.columnSpan,
              visibilityRules: f.visibilityRules || null,
            })),
        },
      },
      include: {
        fields: true,
      },
    });

    console.log(`\nCreated form template: ${form.title}`);
    console.log(`  ID: ${form.id}`);
    console.log(`  Fields: ${form.fields.length}`);

    // Create a QR code for the form
    const shortCode = `test-${Date.now().toString(36)}`;
    const qr = await prisma.qRCode.create({
      data: {
        formTemplateId: form.id,
        shortCode,
        label: "Test QR Code",
        isActive: true,
      },
    });

    console.log(`\nCreated QR code: ${qr.shortCode}`);
    console.log(`  URL: http://localhost:3000/c/${qr.shortCode}`);

  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

seedTestForm().catch((e) => {
  console.error(e);
  process.exit(1);
});
