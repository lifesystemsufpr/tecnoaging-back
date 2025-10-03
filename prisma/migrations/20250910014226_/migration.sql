/*
  Warnings:

  - The values [NO_FORMAL_EDUCATION,MIDDLE_SCHOOL] on the enum `Scholarship` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Scholarship_new" AS ENUM ('NONE', 'FUNDAMENTAL_INCOMPLETE', 'FUNDAMENTAL_COMPLETE', 'HIGH_SCHOOL_INCOMPLETE', 'HIGH_SCHOOL_COMPLETE', 'HIGHER_EDUCATION_INCOMPLETE', 'HIGHER_EDUCATION_COMPLETE', 'POSTGRADUATE', 'MASTERS', 'DOCTORATE');
ALTER TABLE "patient" ALTER COLUMN "scholarship" TYPE "Scholarship_new" USING ("scholarship"::text::"Scholarship_new");
ALTER TYPE "Scholarship" RENAME TO "Scholarship_old";
ALTER TYPE "Scholarship_new" RENAME TO "Scholarship";
DROP TYPE "Scholarship_old";
COMMIT;
