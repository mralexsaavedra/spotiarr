-- CreateTable
CREATE TABLE "ArtworkBackfillRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "cursorKind" TEXT NOT NULL,
    "cursorValue" TEXT,
    "totalCandidates" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "skippedExisting" INTEGER NOT NULL DEFAULT 0,
    "written" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "externalCalls" INTEGER NOT NULL DEFAULT 0,
    "rateLimitUntil" DATETIME,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ArtworkBackfillRun_status_idx" ON "ArtworkBackfillRun"("status");

-- CreateIndex
CREATE INDEX "ArtworkBackfillRun_updatedAt_idx" ON "ArtworkBackfillRun"("updatedAt");
