BEGIN;

CREATE TABLE "AttemptGrade" (
  "attemptId" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "revision" INTEGER NOT NULL,
  "savedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AttemptGrade_pkey" PRIMARY KEY ("attemptId"),
  CONSTRAINT "AttemptGrade_score_check" CHECK ("score" BETWEEN 1 AND 10),
  CONSTRAINT "AttemptGrade_revision_check" CHECK ("revision" BETWEEN 1 AND 2147483647),
  CONSTRAINT "AttemptGrade_attemptId_fkey"
    FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "AttemptGrade_savedAt_attemptId_idx" ON "AttemptGrade"("savedAt", "attemptId");

COMMIT;
