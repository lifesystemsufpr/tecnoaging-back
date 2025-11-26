-- CreateTable
CREATE TABLE "evaluation_indicators" (
    "id" TEXT NOT NULL,
    "repetitionCount" INTEGER NOT NULL DEFAULT 0,
    "meanPower" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalEnergy" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "classification" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluationId" TEXT NOT NULL,

    CONSTRAINT "evaluation_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_indicators_evaluationId_key" ON "evaluation_indicators"("evaluationId");

-- AddForeignKey
ALTER TABLE "evaluation_indicators" ADD CONSTRAINT "evaluation_indicators_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
