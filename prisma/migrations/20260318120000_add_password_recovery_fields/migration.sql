-- AlterTable
ALTER TABLE "user" ADD COLUMN "passwordResetToken" TEXT;
ALTER TABLE "user" ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);
ALTER TABLE "user" ADD COLUMN "passwordResetUsedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "user_passwordResetToken_key" ON "user"("passwordResetToken");
CREATE INDEX "user_passwordResetToken_idx" ON "user"("passwordResetToken");
