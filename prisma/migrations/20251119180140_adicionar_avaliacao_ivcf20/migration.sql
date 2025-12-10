-- CreateEnum
CREATE TYPE "RiskClassification" AS ENUM ('LOW_RISK', 'MODERATE_RISK', 'HIGH_RISK');

-- CreateEnum
CREATE TYPE "AgeGroup" AS ENUM ('AGE_60_74', 'AGE_75_84', 'AGE_85_PLUS');

-- CreateEnum
CREATE TYPE "SelfPerceptionHealth" AS ENUM ('EXCELLENT_VERYGOOD_GOOD', 'REGULAR_OR_BAD');

-- AlterEnum
ALTER TYPE "TypeEvaluation" ADD VALUE 'IVCF20';

-- CreateTable
CREATE TABLE "ivcf20_evaluation" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "healthProfessionalId" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalScore" INTEGER NOT NULL,
    "riskClassification" "RiskClassification" NOT NULL,
    "ageGroup" "AgeGroup" NOT NULL,
    "selfPerceptionHealth" "SelfPerceptionHealth" NOT NULL,
    "avdInstrumentalShopping" BOOLEAN NOT NULL,
    "avdInstrumentalFinance" BOOLEAN NOT NULL,
    "avdInstrumentalHousework" BOOLEAN NOT NULL,
    "avdBasicBathing" BOOLEAN NOT NULL,
    "cognitionFamilyAlert" BOOLEAN NOT NULL,
    "cognitionWorsening" BOOLEAN NOT NULL,
    "cognitionImpediment" BOOLEAN NOT NULL,
    "humorDespair" BOOLEAN NOT NULL,
    "humorLossOfInterest" BOOLEAN NOT NULL,
    "mobilityFineMotor" BOOLEAN NOT NULL,
    "mobilityWalkingDifficulty" BOOLEAN NOT NULL,
    "mobilityFalls" BOOLEAN NOT NULL,
    "communicationHearing" BOOLEAN NOT NULL,
    "communicationSpeaking" BOOLEAN NOT NULL,
    "comorbiditiesFiveOrMore" BOOLEAN NOT NULL,
    "comorbiditiesFiveOrMoreMeds" BOOLEAN NOT NULL,
    "alertSignsIncontinence" BOOLEAN NOT NULL,
    "alertSignsWeightLoss" BOOLEAN NOT NULL,
    "alertSignsLowBMI" BOOLEAN NOT NULL,
    "alertSignsLowCalfCircumference" BOOLEAN NOT NULL,
    "alertSignsSlowGaitSpeed" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ivcf20_evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ivcf20_evaluation_evaluationId_key" ON "ivcf20_evaluation"("evaluationId");

-- AddForeignKey
ALTER TABLE "ivcf20_evaluation" ADD CONSTRAINT "ivcf20_evaluation_patiented_fkey" FOREIGN KEY ("patientId") REFERENCES "patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ivcf20_evaluation" ADD CONSTRAINT "ivcf20_evaluation_healthProfessionalId_fkey" FOREIGN KEY ("healthProfessionalId") REFERENCES "health_professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ivcf20_evaluation" ADD CONSTRAINT "ivcf20_evaluation_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
