ALTER TYPE "ModerationActionType" ADD VALUE 'REOPEN_VERIFICATION';
ALTER TYPE "ModerationActionType" ADD VALUE 'CLEAR_VERIFICATION';
ALTER TABLE "ModerationAction"
  ADD COLUMN "previousVerificationStatus" "VerificationStatus",
  ADD COLUMN "nextVerificationStatus" "VerificationStatus";
