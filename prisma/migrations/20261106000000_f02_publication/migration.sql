-- Additive only: existing archived data requires reconciliation with real dates.
ALTER TABLE "Exercise" ADD COLUMN "editRevision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "previewPublicationKey" TEXT,
  ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "AiUsageEvent" ADD COLUMN "generationTopicDigest" TEXT;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Exercise" WHERE status = 'ARCHIVED'
    AND ("archivedAt" IS NULL OR "publishedAt" IS NULL)) THEN
    RAISE EXCEPTION 'Archived exercise timestamps require owner reconciliation';
  END IF;
END $$;
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_editRevision_check"
  CHECK ("editRevision" BETWEEN 0 AND 2147483647),
  ADD CONSTRAINT "Exercise_archive_timestamps_check" CHECK (
    (status = 'ARCHIVED' AND "archivedAt" IS NOT NULL AND "publishedAt" IS NOT NULL)
    OR (status <> 'ARCHIVED' AND "archivedAt" IS NULL));
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_generationTopicDigest_check"
  CHECK ("generationTopicDigest" IS NULL OR "generationTopicDigest" ~ '^[0-9a-f]{64}$');
CREATE UNIQUE INDEX "Exercise_authorId_previewPublicationKey_key"
  ON "Exercise"("authorId", "previewPublicationKey");
CREATE INDEX "Exercise_authorId_status_archivedAt_idx"
  ON "Exercise"("authorId", "status", "archivedAt");
