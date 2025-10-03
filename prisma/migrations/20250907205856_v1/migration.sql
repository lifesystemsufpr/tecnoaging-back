/*
  Warnings:

  - You are about to drop the column `specialityId` on the `health_professional` table. All the data in the column will be lost.
  - You are about to drop the `fieldOfStudy` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `speciality` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `time_end` to the `evaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `time_init` to the `evaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `speciality` to the `health_professional` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fieldOfStudy` to the `researcher` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "health_professional" DROP CONSTRAINT "health_professional_specialityId_fkey";

-- AlterTable
ALTER TABLE "evaluation" ADD COLUMN     "time_end" TIMESTAMP NOT NULL,
ADD COLUMN     "time_init" TIMESTAMP NOT NULL,
ALTER COLUMN "date" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "health_professional" DROP COLUMN "specialityId",
ADD COLUMN     "speciality" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "researcher" ADD COLUMN     "fieldOfStudy" TEXT NOT NULL;

-- DropTable
DROP TABLE "fieldOfStudy";

-- DropTable
DROP TABLE "speciality";
