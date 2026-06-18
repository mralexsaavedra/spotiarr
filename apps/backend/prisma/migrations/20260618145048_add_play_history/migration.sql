-- CreateTable
CREATE TABLE "PlayHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackId" TEXT,
    "trackUrl" TEXT,
    "trackName" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "album" TEXT,
    "albumCoverUrl" TEXT,
    "durationMs" INTEGER,
    "playedAt" BIGINT NOT NULL,
    "createdAt" BIGINT NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE INDEX "PlayHistory_playedAt_idx" ON "PlayHistory"("playedAt");

-- CreateIndex
CREATE INDEX "PlayHistory_trackUrl_idx" ON "PlayHistory"("trackUrl");

-- CreateIndex
CREATE INDEX "PlayHistory_artist_idx" ON "PlayHistory"("artist");
