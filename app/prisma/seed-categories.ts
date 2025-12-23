/**
 * Category Metadata Seed Script
 *
 * Seeds the CategoryMeta table with the 16 data categories for the patient vault.
 * Categories define how fields are organized in the wallet-style UI.
 *
 * Run with: npx tsx prisma/seed-categories.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

let prisma: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
  if (!prisma) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

interface CategorySeed {
  name: string;
  label: string;
  description: string;
  icon: string;
  sortOrder: number;
  color: string;
  isProtected: boolean;
  previewFields: string[];
}

// =============================================================================
// CATEGORY DEFINITIONS
// =============================================================================
// Top 6 shown by default (sortOrder 1-6), remaining hidden behind "Show more"

const categories: CategorySeed[] = [
  // === PRIMARY CATEGORIES (shown by default) ===
  {
    name: "personal",
    label: "Personal Details",
    description: "Your basic personal information",
    icon: "user",
    sortOrder: 1,
    color: "teal",
    isProtected: false,
    previewFields: ["firstName", "lastName", "gender"],
  },
  {
    name: "identity",
    label: "Identity",
    description: "Your identity documents and numbers",
    icon: "identification",
    sortOrder: 2,
    color: "blue",
    isProtected: true, // ID numbers are sensitive
    previewFields: ["idNumber", "passportNumber"],
  },
  {
    name: "contact",
    label: "Contact",
    description: "Your phone numbers and email addresses",
    icon: "phone",
    sortOrder: 3,
    color: "green",
    isProtected: false,
    previewFields: ["phoneMobile", "emailPersonal"],
  },
  {
    name: "address",
    label: "Address",
    description: "Your residential and postal addresses",
    icon: "home",
    sortOrder: 4,
    color: "purple",
    isProtected: false,
    previewFields: ["suburb", "city"],
  },
  {
    name: "emergency",
    label: "Emergency Contact",
    description: "Who to contact in an emergency",
    icon: "exclamation-triangle",
    sortOrder: 5,
    color: "red",
    isProtected: false,
    previewFields: ["emergencyContactName", "emergencyContactRelationship"],
  },
  {
    name: "medical",
    label: "Medical",
    description: "Your medical history and conditions",
    icon: "heart",
    sortOrder: 6,
    color: "rose",
    isProtected: true, // Medical info is sensitive
    previewFields: ["bloodType", "allergies"],
  },

  // === SECONDARY CATEGORIES (behind "Show more") ===
  {
    name: "insurance",
    label: "Medical Aid",
    description: "Your medical aid and insurance details",
    icon: "shield-check",
    sortOrder: 7,
    color: "cyan",
    isProtected: false,
    previewFields: ["medicalAidName", "medicalAidNumber"],
  },
  {
    name: "responsible",
    label: "Responsible Party",
    description: "Account holder or guardian information",
    icon: "users",
    sortOrder: 8,
    color: "indigo",
    isProtected: false,
    previewFields: ["responsiblePartyName", "responsiblePartyRelationship"],
  },
  {
    name: "preferences",
    label: "Preferences",
    description: "Your communication and accessibility preferences",
    icon: "adjustments-horizontal",
    sortOrder: 9,
    color: "amber",
    isProtected: false,
    previewFields: ["homeLanguage", "communicationPreference"],
  },
  {
    name: "consent",
    label: "Consent",
    description: "Your data sharing consents",
    icon: "check-badge",
    sortOrder: 10,
    color: "emerald",
    isProtected: false,
    previewFields: [],
  },
  {
    name: "employment",
    label: "Employment",
    description: "Your occupation and employer details",
    icon: "briefcase",
    sortOrder: 11,
    color: "slate",
    isProtected: false,
    previewFields: ["occupation", "employer"],
  },
  {
    name: "education",
    label: "Education",
    description: "Your educational background",
    icon: "academic-cap",
    sortOrder: 12,
    color: "violet",
    isProtected: false,
    previewFields: ["highestQualification"],
  },
  {
    name: "financial",
    label: "Financial",
    description: "Your banking and payment details",
    icon: "credit-card",
    sortOrder: 13,
    color: "yellow",
    isProtected: true, // Financial info is sensitive
    previewFields: ["bankName"],
  },
  {
    name: "legal",
    label: "Legal",
    description: "Power of attorney and legal directives",
    icon: "scale",
    sortOrder: 14,
    color: "gray",
    isProtected: true, // Legal info is sensitive
    previewFields: [],
  },
  {
    name: "membership",
    label: "Memberships",
    description: "Your loyalty programs and memberships",
    icon: "ticket",
    sortOrder: 15,
    color: "orange",
    isProtected: false,
    previewFields: [],
  },
  {
    name: "events",
    label: "Events",
    description: "Important dates and appointments",
    icon: "calendar",
    sortOrder: 16,
    color: "sky",
    isProtected: false,
    previewFields: [],
  },
];

// =============================================================================
// SEED FUNCTION
// =============================================================================

async function seedCategories() {
  const db = getPrismaClient();

  console.log("Seeding category metadata...\n");

  let created = 0;
  let updated = 0;

  for (const category of categories) {
    const existing = await db.categoryMeta.findUnique({
      where: { name: category.name },
    });

    if (existing) {
      await db.categoryMeta.update({
        where: { name: category.name },
        data: {
          label: category.label,
          description: category.description,
          icon: category.icon,
          sortOrder: category.sortOrder,
          color: category.color,
          isProtected: category.isProtected,
          previewFields: category.previewFields,
        },
      });
      updated++;
      console.log(`  Updated: ${category.name} (${category.label})`);
    } else {
      await db.categoryMeta.create({
        data: {
          name: category.name,
          label: category.label,
          description: category.description,
          icon: category.icon,
          sortOrder: category.sortOrder,
          color: category.color,
          isProtected: category.isProtected,
          previewFields: category.previewFields,
          isActive: true,
        },
      });
      created++;
      console.log(`  Created: ${category.name} (${category.label})`);
    }
  }

  console.log(`\nCategory seeding complete!`);
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Total: ${categories.length}`);

  await db.$disconnect();
}

// Run the seed
seedCategories()
  .catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  });
