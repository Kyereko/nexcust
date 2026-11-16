-- CreateEnum
CREATE TYPE "CriminalIdent" AS ENUM ('IDENT', 'NOT_IDENT', 'NOT_RECORDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BackgroundCheckStatus" ADD VALUE 'PAYMENT_CONFIRMED';
ALTER TYPE "BackgroundCheckStatus" ADD VALUE 'APPOINTMENT_BOOKED';
ALTER TYPE "BackgroundCheckStatus" ADD VALUE 'BIOMETRICS_CAPTURED';
ALTER TYPE "BackgroundCheckStatus" ADD VALUE 'ADDITIONAL_INFO_REQUESTED';
ALTER TYPE "BackgroundCheckStatus" ADD VALUE 'UNDER_INVESTIGATION';
ALTER TYPE "BackgroundCheckStatus" ADD VALUE 'DISPATCHED';

-- AlterTable
ALTER TABLE "background_check_applications" ADD COLUMN     "appointmentAt" TIMESTAMP(3),
ADD COLUMN     "attendedAt" TIMESTAMP(3),
ADD COLUMN     "biometricCaptureMode" TEXT,
ADD COLUMN     "captureCentre" TEXT,
ADD COLUMN     "criminalIdent" "CriminalIdent",
ADD COLUMN     "deliveryPostOffice" TEXT,
ADD COLUMN     "dispatchedAt" TIMESTAMP(3),
ADD COLUMN     "parcelBatchNo" TEXT,
ADD COLUMN     "paymentRef" TEXT,
ADD COLUMN     "residenceAttested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resumeStatus" "BackgroundCheckStatus",
ADD COLUMN     "serviceTypeId" UUID;

-- AlterTable
ALTER TABLE "clearance_certificates" ADD COLUMN     "signatoryTitle" TEXT,
ADD COLUMN     "signsFor" TEXT;

-- CreateTable
CREATE TABLE "clearance_service_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vettingFeeGhs" INTEGER NOT NULL,
    "addOnFeeGhs" INTEGER NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "requiresFingerprints" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNCONFIRMED',
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clearance_service_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authorised_signatories" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "signatoryTitle" TEXT NOT NULL,
    "signsFor" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authorised_signatories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clearance_service_types_code_key" ON "clearance_service_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "authorised_signatories_userId_key" ON "authorised_signatories"("userId");

-- AddForeignKey
ALTER TABLE "background_check_applications" ADD CONSTRAINT "background_check_applications_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "clearance_service_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
