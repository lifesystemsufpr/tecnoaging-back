-- CreateTable
CREATE TABLE "pre_registration" (
    "id" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "birthday" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pre_registration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pre_registration_cpf_key" ON "pre_registration"("cpf");

