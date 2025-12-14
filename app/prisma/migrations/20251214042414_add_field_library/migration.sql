-- AlterTable
ALTER TABLE "pending_provider_registration" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + interval '24 hours';

-- CreateTable
CREATE TABLE "field_definition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "fieldType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "config" TEXT,
    "validation" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "field_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_template" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "consentClause" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "form_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_field" (
    "id" TEXT NOT NULL,
    "formTemplateId" TEXT NOT NULL,
    "fieldDefinitionId" TEXT NOT NULL,
    "labelOverride" TEXT,
    "helpText" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "section" TEXT,
    "visibilityRules" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_code" (
    "id" TEXT NOT NULL,
    "formTemplateId" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "qr_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission" (
    "id" TEXT NOT NULL,
    "formTemplateId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "data" TEXT NOT NULL,
    "consentToken" TEXT,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source" TEXT NOT NULL DEFAULT 'web',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "field_definition_category_isActive_idx" ON "field_definition"("category", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "field_definition_name_key" ON "field_definition"("name");

-- CreateIndex
CREATE INDEX "form_template_organizationId_isActive_idx" ON "form_template"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "form_field_formTemplateId_sortOrder_idx" ON "form_field"("formTemplateId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "form_field_formTemplateId_fieldDefinitionId_key" ON "form_field"("formTemplateId", "fieldDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "qr_code_shortCode_key" ON "qr_code"("shortCode");

-- CreateIndex
CREATE INDEX "qr_code_shortCode_idx" ON "qr_code"("shortCode");

-- CreateIndex
CREATE UNIQUE INDEX "submission_consentToken_key" ON "submission"("consentToken");

-- CreateIndex
CREATE INDEX "submission_organizationId_createdAt_idx" ON "submission"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "submission_formTemplateId_status_idx" ON "submission"("formTemplateId", "status");

-- CreateIndex
CREATE INDEX "submission_userId_idx" ON "submission"("userId");

-- AddForeignKey
ALTER TABLE "form_template" ADD CONSTRAINT "form_template_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_field" ADD CONSTRAINT "form_field_formTemplateId_fkey" FOREIGN KEY ("formTemplateId") REFERENCES "form_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_field" ADD CONSTRAINT "form_field_fieldDefinitionId_fkey" FOREIGN KEY ("fieldDefinitionId") REFERENCES "field_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_code" ADD CONSTRAINT "qr_code_formTemplateId_fkey" FOREIGN KEY ("formTemplateId") REFERENCES "form_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_formTemplateId_fkey" FOREIGN KEY ("formTemplateId") REFERENCES "form_template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
