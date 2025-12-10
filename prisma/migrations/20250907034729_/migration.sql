/*
  Warnings:

  - You are about to drop the column `socioEconomicLevel` on the `participant` table. All the data in the column will be lost.
  - Changed the type of `type` on the `evaluation` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `socio_economic_level` to the `participant` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `scholarship` on the `participant` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `gender` on the `user` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `role` on the `user` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('MANAGER', 'PARTICIPANT', 'RESEARCHER', 'HEALTH_PROFESSIONAL');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "Scholarship" AS ENUM ('NO_FORMAL_EDUCATION', 'MIDDLE_SCHOOL', 'HIGHER_EDUCATION_INCOMPLETE', 'HIGHER_EDUCATION_COMPLETE');

-- CreateEnum
CREATE TYPE "SocialEconomicLevel" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "TypeEvaluation" AS ENUM ('FTSTS', 'TUG');

-- AlterTable
ALTER TABLE "evaluation" DROP COLUMN "type",
ADD COLUMN     "type" "TypeEvaluation" NOT NULL,
ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "health_professional" ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "participant" DROP COLUMN "socioEconomicLevel",
ADD COLUMN     "socio_economic_level" "SocialEconomicLevel" NOT NULL,
ALTER COLUMN "birthday" SET DATA TYPE TIMESTAMP(3),
DROP COLUMN "scholarship",
ADD COLUMN     "scholarship" "Scholarship" NOT NULL,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "researcher" ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sensor_data" ALTER COLUMN "timestamp" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "accel_x" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "accel_y" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "gyro_x" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "gyro_y" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "gyro_z" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "user" DROP COLUMN "gender",
ADD COLUMN     "gender" "Gender" NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "SystemRole" NOT NULL,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);
