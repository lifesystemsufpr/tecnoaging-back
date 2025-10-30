-- AlterTable
ALTER TABLE "sensor_data" ADD COLUMN     "accel_z" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- CreateIndex
CREATE INDEX "evaluation_patientId_idx" ON "evaluation"("patientId");

-- CreateIndex
CREATE INDEX "evaluation_healthProfessionalId_idx" ON "evaluation"("healthProfessionalId");

-- CreateIndex
CREATE INDEX "evaluation_healthcareUnitId_idx" ON "evaluation"("healthcareUnitId");

-- CreateIndex
CREATE INDEX "evaluation_date_idx" ON "evaluation"("date");

-- CreateIndex
CREATE INDEX "evaluation_type_idx" ON "evaluation"("type");

-- CreateIndex
CREATE INDEX "health_professional_speciality_idx" ON "health_professional"("speciality");

-- CreateIndex
CREATE INDEX "health_professional_active_idx" ON "health_professional"("active");

-- CreateIndex
CREATE INDEX "researcher_institutionId_idx" ON "researcher"("institutionId");

-- CreateIndex
CREATE INDEX "sensor_data_evaluationId_idx" ON "sensor_data"("evaluationId");

-- CreateIndex
CREATE INDEX "sensor_data_timestamp_idx" ON "sensor_data"("timestamp");
