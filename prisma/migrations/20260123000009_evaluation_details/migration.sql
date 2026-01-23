-- AlterTable
ALTER TABLE "evaluation_indicators" ADD COLUMN     "processedCurve" JSONB;

-- CreateTable
CREATE TABLE "evaluation_cycle" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "totalTime" DOUBLE PRECISION NOT NULL,
    "standUpTime" DOUBLE PRECISION NOT NULL,
    "sitDownTime" DOUBLE PRECISION NOT NULL,
    "frequency" DOUBLE PRECISION NOT NULL,
    "meanPower" DOUBLE PRECISION NOT NULL,
    "extensionVel" DOUBLE PRECISION NOT NULL,
    "flexionVel" DOUBLE PRECISION NOT NULL,
    "peak1Val" DOUBLE PRECISION,
    "peak2Val" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_cycle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evaluation_cycle_evaluationId_idx" ON "evaluation_cycle"("evaluationId");

-- AddForeignKey
ALTER TABLE "evaluation_cycle" ADD CONSTRAINT "evaluation_cycle_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
