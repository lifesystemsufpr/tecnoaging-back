-- CreateTable
CREATE TABLE "tecnoAging_user" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cpf" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "updatedAt" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "healthcare_unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "institution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL
);
-- CreateTable
CREATE TABLE "speciality" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL
);
--CreateTable
CREATE TABLE "fieldOfStudy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL
);
-- CreateTable
CREATE TABLE "researcher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "updatedAt" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "researcher_id_fkey" FOREIGN KEY ("id") REFERENCES "tecnoAging_user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "researcher_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "health_professional" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "specialityId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "updatedAt" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "health_professional_id_fkey" FOREIGN KEY ("id") REFERENCES "tecnoAging_user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "health_professional_specialityId_fkey" FOREIGN KEY ("specialityId") REFERENCES "speciality" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "birthday" DATE NOT NULL,
    "scholarship" TEXT NOT NULL,
    "socioEconomicLevel" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "zipCode" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "updatedAt" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "patient_id_fkey" FOREIGN KEY ("id") REFERENCES "tecnoAging_user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "evaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "healthProfessionalId" TEXT NOT NULL,
    "healthcareUnitId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "updatedAt" DATE NOT NULL,
    CONSTRAINT "evaluation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "evaluation_healthProfessionalId_fkey" FOREIGN KEY ("healthProfessionalId") REFERENCES "health_professional" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "evaluation_healthcareUnitId_fkey" FOREIGN KEY ("healthcareUnitId") REFERENCES "healthcare_unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sensor_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATE NOT NULL,
    "accel_x" REAL NOT NULL,
    "accel_y" REAL NOT NULL,
    "gyro_x" REAL NOT NULL,
    "gyro_y" REAL NOT NULL,
    "gyro_z" REAL NOT NULL,
    "evaluationId" TEXT NOT NULL,
    CONSTRAINT "sensor_data_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "tecnoAging_user_cpf_key" ON "tecnoAging_user"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "researcher_id_key" ON "researcher"("id");

-- CreateIndex
CREATE UNIQUE INDEX "researcher_email_key" ON "researcher"("email");

-- CreateIndex
CREATE UNIQUE INDEX "health_professional_id_key" ON "health_professional"("id");

-- CreateIndex
CREATE UNIQUE INDEX "health_professional_email_key" ON "health_professional"("email");

-- CreateIndex
CREATE UNIQUE INDEX "patient_id_key" ON "patient"("id");
