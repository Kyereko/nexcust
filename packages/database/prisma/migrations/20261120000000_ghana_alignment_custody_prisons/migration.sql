-- CreateEnum
CREATE TYPE "ArrestBasis" AS ENUM ('WARRANT', 'WITHOUT_WARRANT_S10', 'PRIVATE_PERSON_S12');

-- CreateEnum
CREATE TYPE "BailReportTo" AS ENUM ('COURT', 'POLICE_STATION');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CourtOrderType" ADD VALUE 'REMAND_COMMITMENT_FOR_TRIAL';
ALTER TYPE "CourtOrderType" ADD VALUE 'COMMITMENT_TO_UNDERGO_SENTENCE';
ALTER TYPE "CourtOrderType" ADD VALUE 'COMMITMENT_ON_DEFAULT_OF_PAYMENT';
ALTER TYPE "CourtOrderType" ADD VALUE 'DISCHARGE_WARRANT';
ALTER TYPE "CourtOrderType" ADD VALUE 'ORDER_TO_PRODUCE_PRISONER';
ALTER TYPE "CourtOrderType" ADD VALUE 'RELEASE_ON_BAIL_ORDER';
ALTER TYPE "CourtOrderType" ADD VALUE 'JUVENILE_DETENTION_ORDER';

-- AlterEnum
ALTER TYPE "PrisonerClassification" ADD VALUE 'DEFAULTER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReleaseType" ADD VALUE 'END_OF_SENTENCE_WITH_REMISSION';
ALTER TYPE "ReleaseType" ADD VALUE 'RELEASE_ON_BAIL_ORDER';
ALTER TYPE "ReleaseType" ADD VALUE 'DISCHARGE_WARRANT';
ALTER TYPE "ReleaseType" ADD VALUE 'PARDON_FREE';
ALTER TYPE "ReleaseType" ADD VALUE 'PARDON_CONDITIONAL';
ALTER TYPE "ReleaseType" ADD VALUE 'PUNISHMENT_REMITTED';
ALTER TYPE "ReleaseType" ADD VALUE 'AMNESTY';

-- AlterTable
ALTER TABLE "arrests" ADD COLUMN     "arrestBasis" "ArrestBasis",
ADD COLUMN     "languageUsed" TEXT,
ADD COLUMN     "lawyerRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reasonsGivenAt" TIMESTAMP(3),
ADD COLUMN     "rightToLawyerGivenAt" TIMESTAMP(3),
ADD COLUMN     "warrantRef" TEXT;

-- AlterTable
ALTER TABLE "court_orders" ADD COLUMN     "formNumber" TEXT,
ADD COLUMN     "issuingJudicialOfficer" TEXT;

-- AlterTable
ALTER TABLE "police_custody_episodes" ADD COLUMN     "isJuvenile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "juvenileDetentionOrderDueAt" TIMESTAMP(3),
ADD COLUMN     "parentGuardianNotifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "prison_admissions" ADD COLUMN     "conditionAtHandover" TEXT,
ADD COLUMN     "escortingOfficer" TEXT,
ADD COLUMN     "fitForAdmission" BOOLEAN,
ADD COLUMN     "infectiousDiseaseFlag" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "medicalScreenedAt" TIMESTAMP(3),
ADD COLUMN     "screenedByRole" TEXT;

-- AlterTable
ALTER TABLE "prison_releases" ADD COLUMN     "dischargeBoardReviewedAt" TIMESTAMP(3),
ADD COLUMN     "warrantReturnedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sentence_records" ADD COLUMN     "remissionEligible" BOOLEAN,
ADD COLUMN     "sentenceStartDate" DATE;

-- CreateTable
CREATE TABLE "police_bail_bonds" (
    "id" UUID NOT NULL,
    "episodeId" UUID NOT NULL,
    "amountGhs" INTEGER NOT NULL,
    "sureties" JSONB NOT NULL DEFAULT '[]',
    "reportTo" "BailReportTo" NOT NULL,
    "reportPlace" TEXT NOT NULL,
    "reportAt" TIMESTAMP(3) NOT NULL,
    "depositInLieuGhs" INTEGER,
    "grantedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "police_bail_bonds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remission_forfeitures" (
    "id" UUID NOT NULL,
    "sentenceId" UUID NOT NULL,
    "days" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "forfeitedOn" DATE NOT NULL,
    "authorisedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "remission_forfeitures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "police_bail_bonds_episodeId_key" ON "police_bail_bonds"("episodeId");

-- CreateIndex
CREATE INDEX "remission_forfeitures_sentenceId_idx" ON "remission_forfeitures"("sentenceId");

-- AddForeignKey
ALTER TABLE "police_bail_bonds" ADD CONSTRAINT "police_bail_bonds_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "police_custody_episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remission_forfeitures" ADD CONSTRAINT "remission_forfeitures_sentenceId_fkey" FOREIGN KEY ("sentenceId") REFERENCES "sentence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
