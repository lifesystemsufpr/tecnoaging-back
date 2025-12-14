-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'MULTIPLE_CHOICE', 'SCALE');

-- CreateTable
CREATE TABLE "questionnaire" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionnaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_group" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "description" TEXT,
    "questionnaireId" TEXT NOT NULL,

    CONSTRAINT "question_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_subgroup" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "description" TEXT,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "question_subgroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question" (
    "id" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "QuestionType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "groupId" TEXT,
    "subGroupId" TEXT,

    CONSTRAINT "question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_option" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "question_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_response" (
    "id" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "classification" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "participantId" TEXT NOT NULL,
    "healthProfessionalId" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionnaire_response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer" (
    "id" TEXT NOT NULL,
    "questionnaireResponseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "valueText" TEXT,

    CONSTRAINT "answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "questionnaire_slug_key" ON "questionnaire"("slug");

-- CreateIndex
CREATE INDEX "question_group_questionnaireId_idx" ON "question_group"("questionnaireId");

-- CreateIndex
CREATE INDEX "question_subgroup_groupId_idx" ON "question_subgroup"("groupId");

-- CreateIndex
CREATE INDEX "question_option_questionId_idx" ON "question_option"("questionId");

-- CreateIndex
CREATE INDEX "questionnaire_response_participantId_idx" ON "questionnaire_response"("participantId");

-- CreateIndex
CREATE INDEX "questionnaire_response_healthProfessionalId_idx" ON "questionnaire_response"("healthProfessionalId");

-- CreateIndex
CREATE INDEX "answer_questionnaireResponseId_idx" ON "answer"("questionnaireResponseId");

-- AddForeignKey
ALTER TABLE "question_group" ADD CONSTRAINT "question_group_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_subgroup" ADD CONSTRAINT "question_subgroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "question_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "question_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_subGroupId_fkey" FOREIGN KEY ("subGroupId") REFERENCES "question_subgroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_option" ADD CONSTRAINT "question_option_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_response" ADD CONSTRAINT "questionnaire_response_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_response" ADD CONSTRAINT "questionnaire_response_healthProfessionalId_fkey" FOREIGN KEY ("healthProfessionalId") REFERENCES "health_professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_response" ADD CONSTRAINT "questionnaire_response_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "questionnaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer" ADD CONSTRAINT "answer_questionnaireResponseId_fkey" FOREIGN KEY ("questionnaireResponseId") REFERENCES "questionnaire_response"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer" ADD CONSTRAINT "answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer" ADD CONSTRAINT "answer_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "question_option"("id") ON DELETE SET NULL ON UPDATE CASCADE;
