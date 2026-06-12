-- Add deactivation audit fields to user
ALTER TABLE "user" ADD COLUMN "deactivatedAt" TIMESTAMP(3);
ALTER TABLE "user" ADD COLUMN "deactivatedBy" TEXT;
ALTER TABLE "user" ADD COLUMN "deactivationReason" TEXT;
ALTER TABLE "user" ADD COLUMN "reactivatedAt" TIMESTAMP(3);
ALTER TABLE "user" ADD COLUMN "reactivatedBy" TEXT;

-- Add deactivation audit fields to institution
ALTER TABLE "institution" ADD COLUMN "deactivatedAt" TIMESTAMP(3);
ALTER TABLE "institution" ADD COLUMN "deactivatedBy" TEXT;
ALTER TABLE "institution" ADD COLUMN "deactivationReason" TEXT;
ALTER TABLE "institution" ADD COLUMN "reactivatedAt" TIMESTAMP(3);
ALTER TABLE "institution" ADD COLUMN "reactivatedBy" TEXT;

-- Add deactivation audit fields to healthcare_unit
ALTER TABLE "healthcare_unit" ADD COLUMN "deactivatedAt" TIMESTAMP(3);
ALTER TABLE "healthcare_unit" ADD COLUMN "deactivatedBy" TEXT;
ALTER TABLE "healthcare_unit" ADD COLUMN "deactivationReason" TEXT;
ALTER TABLE "healthcare_unit" ADD COLUMN "reactivatedAt" TIMESTAMP(3);
ALTER TABLE "healthcare_unit" ADD COLUMN "reactivatedBy" TEXT;
