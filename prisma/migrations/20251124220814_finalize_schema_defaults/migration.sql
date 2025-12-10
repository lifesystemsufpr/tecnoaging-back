/*
  Warnings:

  - The values [TUG] on the enum `TypeEvaluation` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TypeEvaluation_new" AS ENUM ('FTSTS', 'TTSTS');
ALTER TABLE "evaluation" ALTER COLUMN "type" TYPE "TypeEvaluation_new" USING ("type"::text::"TypeEvaluation_new");
ALTER TYPE "TypeEvaluation" RENAME TO "TypeEvaluation_old";
ALTER TYPE "TypeEvaluation_new" RENAME TO "TypeEvaluation";
DROP TYPE "TypeEvaluation_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "sensor_data" DROP CONSTRAINT "sensor_data_evaluationId_fkey";

-- AlterTable
ALTER TABLE "evaluation" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "date" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "health_professional" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "healthcare_unit" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "institution" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "participant" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "weight" SET DEFAULT 0,
ALTER COLUMN "height" SET DEFAULT 0,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "researcher" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sensor_data" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "accel_x" SET DEFAULT 0.0,
ALTER COLUMN "accel_y" SET DEFAULT 0.0,
ALTER COLUMN "gyro_x" SET DEFAULT 0.0,
ALTER COLUMN "gyro_y" SET DEFAULT 0.0,
ALTER COLUMN "gyro_z" SET DEFAULT 0.0;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "sensor_data" ADD CONSTRAINT "sensor_data_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
