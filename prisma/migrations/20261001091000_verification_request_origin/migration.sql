-- Persist the initiating context independently of future role changes.
ALTER TABLE "RecipeVerificationRequest"
  ADD COLUMN "initiatedByAdmin" BOOLEAN NOT NULL DEFAULT false;
