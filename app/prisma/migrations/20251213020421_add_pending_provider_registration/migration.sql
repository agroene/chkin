-- CreateTable
CREATE TABLE "pending_provider_registration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "practiceName" TEXT NOT NULL,
    "practiceNumber" TEXT,
    "phone" TEXT NOT NULL,
    "industryType" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT NOW() + interval '24 hours',

    CONSTRAINT "pending_provider_registration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_provider_registration_userId_key" ON "pending_provider_registration"("userId");

-- AddForeignKey
ALTER TABLE "pending_provider_registration" ADD CONSTRAINT "pending_provider_registration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
