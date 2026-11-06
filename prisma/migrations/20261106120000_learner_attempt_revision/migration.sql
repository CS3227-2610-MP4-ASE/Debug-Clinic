-- Detect legacy duplicates before adding the learner/version invariant. Never merge
-- or delete existing attempts automatically; operators must reconcile them.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Attempt"
    GROUP BY "learnerId", "exerciseVersionId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate attempts exist for a learner and exercise version; reconcile before applying learner attempt migration';
  END IF;
END $$;

ALTER TABLE "Attempt" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_revision_check"
  CHECK ("revision" BETWEEN 0 AND 2147483647);
CREATE UNIQUE INDEX "Attempt_learnerId_exerciseVersionId_key"
  ON "Attempt"("learnerId", "exerciseVersionId");
