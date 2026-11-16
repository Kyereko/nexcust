-- AlterTable
ALTER TABLE "police_custody_episodes" ADD COLUMN     "searchOverrideReason" TEXT,
ADD COLUMN     "searchedAt" TIMESTAMP(3),
ADD COLUMN     "searchingOfficer" TEXT,
ADD COLUMN     "searchingOfficerSex" "Sex";

-- CreateTable
CREATE TABLE "custody_property_items" (
    "id" UUID NOT NULL,
    "episodeId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sealedBagRef" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" UUID NOT NULL,
    "outcome" TEXT,
    "outcomeAt" TIMESTAMP(3),
    "outcomeById" UUID,
    "receivedBy" TEXT,

    CONSTRAINT "custody_property_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custody_property_items_episodeId_idx" ON "custody_property_items"("episodeId");

-- AddForeignKey
ALTER TABLE "custody_property_items" ADD CONSTRAINT "custody_property_items_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "police_custody_episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
