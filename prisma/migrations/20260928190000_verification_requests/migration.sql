BEGIN;
LOCK TABLE "RecipeVerificationRequest" IN SHARE ROW EXCLUSIVE MODE;
DO $$
DECLARE conflicts text;
BEGIN
  SELECT string_agg("recipeId", ', ') INTO conflicts FROM (
    SELECT "recipeId" FROM "RecipeVerificationRequest"
    WHERE status = 'PENDING' GROUP BY "recipeId" HAVING count(*) > 1
  ) duplicates;
  IF conflicts IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate pending verification requests for recipes: %', conflicts;
  END IF;
END $$;
ALTER TABLE "ModerationAction" ADD COLUMN "creatorMessage" VARCHAR(1000);
CREATE UNIQUE INDEX "RecipeVerificationRequest_one_pending_per_recipe"
ON "RecipeVerificationRequest" ("recipeId") WHERE status = 'PENDING';
COMMIT;
