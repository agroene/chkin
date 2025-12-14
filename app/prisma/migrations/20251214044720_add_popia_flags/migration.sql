/*
  Warnings:

  - Made the column `description` on table `field_definition` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "field_definition" ADD COLUMN     "requiresExplicitConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "specialPersonalInfo" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "description" SET NOT NULL;

-- AlterTable
ALTER TABLE "pending_provider_registration" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + interval '24 hours';

-- CreateIndex
CREATE INDEX "field_definition_specialPersonalInfo_idx" ON "field_definition"("specialPersonalInfo");
