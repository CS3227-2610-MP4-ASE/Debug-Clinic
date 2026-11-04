ALTER TABLE "ExerciseVersion"
  ADD COLUMN "topic" TEXT,
  ADD COLUMN "bugExplanation" TEXT,
  ADD COLUMN "correctedSolution" TEXT,
  ADD COLUMN "generationProvenance" JSONB;
