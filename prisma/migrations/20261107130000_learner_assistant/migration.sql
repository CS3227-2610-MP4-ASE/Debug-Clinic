CREATE TABLE "LearnerAssistantConversation" (
  "id" TEXT NOT NULL,
  "learnerId" TEXT NOT NULL,
  "exerciseVersionId" TEXT NOT NULL,
  "unlockedLevel" INTEGER NOT NULL DEFAULT 1,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "contentGeneration" INTEGER NOT NULL DEFAULT 0,
  "hasSuccessfulReply" BOOLEAN NOT NULL DEFAULT false,
  "lastActivityAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "LearnerAssistantConversation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearnerAssistantConversation_level_check" CHECK ("unlockedLevel" BETWEEN 1 AND 3),
  CONSTRAINT "LearnerAssistantConversation_revision_check" CHECK ("revision" >= 0),
  CONSTRAINT "LearnerAssistantConversation_generation_check" CHECK ("contentGeneration" >= 0)
);
CREATE UNIQUE INDEX "LearnerAssistantConversation_learnerId_exerciseVersionId_key"
  ON "LearnerAssistantConversation"("learnerId", "exerciseVersionId");
CREATE INDEX "LearnerAssistantConversation_expiresAt_idx" ON "LearnerAssistantConversation"("expiresAt");
ALTER TABLE "LearnerAssistantConversation" ADD CONSTRAINT "LearnerAssistantConversation_learnerId_fkey"
  FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearnerAssistantConversation" ADD CONSTRAINT "LearnerAssistantConversation_exerciseVersionId_fkey"
  FOREIGN KEY ("exerciseVersionId") REFERENCES "ExerciseVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LearnerAssistantMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "role" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "level" INTEGER NOT NULL,
  "requestId" TEXT NOT NULL,
  "shareCode" BOOLEAN NOT NULL DEFAULT false,
  "shareReasoning" BOOLEAN NOT NULL DEFAULT false,
  "shareOutput" BOOLEAN NOT NULL DEFAULT false,
  "codeSnapshot" TEXT,
  "reasoningSnapshot" TEXT,
  "outputSnapshot" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearnerAssistantMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearnerAssistantMessage_role_check" CHECK ("role" IN ('LEARNER', 'ASSISTANT')),
  CONSTRAINT "LearnerAssistantMessage_level_check" CHECK ("level" BETWEEN 1 AND 3),
  CONSTRAINT "LearnerAssistantMessage_snapshot_check" CHECK (("shareCode" OR "codeSnapshot" IS NULL) AND ("shareReasoning" OR "reasoningSnapshot" IS NULL) AND ("shareOutput" OR "outputSnapshot" IS NULL))
);
CREATE UNIQUE INDEX "LearnerAssistantMessage_conversationId_sequence_key"
  ON "LearnerAssistantMessage"("conversationId", "sequence");
CREATE INDEX "LearnerAssistantMessage_conversationId_createdAt_idx"
  ON "LearnerAssistantMessage"("conversationId", "createdAt");
ALTER TABLE "LearnerAssistantMessage" ADD CONSTRAINT "LearnerAssistantMessage_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "LearnerAssistantConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LearnerAssistantRequest" (
  "id" TEXT NOT NULL,
  "learnerId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "payloadDigest" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "expectedRevision" INTEGER NOT NULL,
  "contentGeneration" INTEGER NOT NULL,
  "targetLevel" INTEGER NOT NULL,
  "leaseExpiresAt" TIMESTAMP(3),
  "replyMessageId" TEXT,
  "providerAttempts" INTEGER NOT NULL DEFAULT 0,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearnerAssistantRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearnerAssistantRequest_action_check" CHECK ("action" IN ('MESSAGE', 'NEXT_HINT', 'CLEAR')),
  CONSTRAINT "LearnerAssistantRequest_status_check" CHECK ("status" IN ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED')),
  CONSTRAINT "LearnerAssistantRequest_level_check" CHECK ("targetLevel" BETWEEN 1 AND 3),
  CONSTRAINT "LearnerAssistantRequest_attempts_check" CHECK ("providerAttempts" BETWEEN 0 AND 2)
);
CREATE UNIQUE INDEX "LearnerAssistantRequest_conversationId_requestId_key"
  ON "LearnerAssistantRequest"("conversationId", "requestId");
CREATE UNIQUE INDEX "LearnerAssistantRequest_learnerId_requestId_key"
  ON "LearnerAssistantRequest"("learnerId", "requestId");
CREATE INDEX "LearnerAssistantRequest_status_leaseExpiresAt_idx"
  ON "LearnerAssistantRequest"("status", "leaseExpiresAt");
CREATE INDEX "LearnerAssistantRequest_createdAt_idx" ON "LearnerAssistantRequest"("createdAt");
CREATE INDEX "LearnerAssistantRequest_learnerId_action_createdAt_idx"
  ON "LearnerAssistantRequest"("learnerId", "action", "createdAt");
ALTER TABLE "LearnerAssistantRequest" ADD CONSTRAINT "LearnerAssistantRequest_learnerId_fkey"
  FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearnerAssistantRequest" ADD CONSTRAINT "LearnerAssistantRequest_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "LearnerAssistantConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LearnerAssistantQuota" (
  "learnerId" TEXT NOT NULL,
  "windowStartedAt" TIMESTAMP(3),
  "windowCount" INTEGER NOT NULL DEFAULT 0,
  "localDate" TEXT,
  "dailyCount" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "LearnerAssistantQuota_pkey" PRIMARY KEY ("learnerId"),
  CONSTRAINT "LearnerAssistantQuota_window_check" CHECK ("windowCount" BETWEEN 0 AND 10),
  CONSTRAINT "LearnerAssistantQuota_daily_check" CHECK ("dailyCount" BETWEEN 0 AND 100)
);
ALTER TABLE "LearnerAssistantQuota" ADD CONSTRAINT "LearnerAssistantQuota_learnerId_fkey"
  FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
