-- AlterTable
ALTER TABLE "sensor_data" ADD COLUMN     "filtered" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "evaluation_time_end_idx" ON "evaluation"("time_end" DESC);

-- CreateIndex
CREATE INDEX "sensor_data_evaluationId_filtered_idx" ON "sensor_data"("evaluationId", "filtered");
