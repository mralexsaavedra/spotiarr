-- CreateTable
CREATE TABLE "PlaylistCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cacheKey" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "cachedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PlaylistCache_cacheKey_key" ON "PlaylistCache"("cacheKey");

-- CreateIndex
CREATE INDEX "PlaylistCache_expiresAt_idx" ON "PlaylistCache"("expiresAt");
