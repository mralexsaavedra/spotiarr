-- CreateTable
CREATE TABLE "AiChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentKey" TEXT,
    "contentParams" TEXT,
    "playlistId" TEXT,
    "errorCode" TEXT,
    "createdAt" BIGINT NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE INDEX "AiChatMessage_createdAt_idx" ON "AiChatMessage"("createdAt");
