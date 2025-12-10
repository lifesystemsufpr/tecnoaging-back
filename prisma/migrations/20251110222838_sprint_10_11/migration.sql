-- AlterEnum
ALTER TYPE "SocialEconomicLevel" ADD VALUE 'E';

-- AlterTable
ALTER TABLE "health_professional" ADD COLUMN     "speciality_normalized" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "healthcare_unit" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "name_normalized" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "institution" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "title_normalized" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "researcher" ALTER COLUMN "fieldOfStudy" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "fullName_normalized" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "health_professional_speciality_normalized_idx" ON "health_professional"("speciality_normalized");

-- CreateIndex
CREATE INDEX "healthcare_unit_name_normalized_idx" ON "healthcare_unit"("name_normalized");

-- CreateIndex
CREATE INDEX "healthcare_unit_active_idx" ON "healthcare_unit"("active");

-- CreateIndex
CREATE INDEX "institution_title_normalized_idx" ON "institution"("title_normalized");

-- CreateIndex
CREATE INDEX "institution_active_idx" ON "institution"("active");

-- CreateIndex
CREATE INDEX "user_fullName_normalized_idx" ON "user"("fullName_normalized");
