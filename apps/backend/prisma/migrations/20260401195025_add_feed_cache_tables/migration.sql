-- CreateTable
CREATE TABLE "FollowedArtistCache" (
    "spotifyId" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "spotifyUrl" TEXT,
    "syncedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ArtistReleaseCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artistId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "albumName" TEXT NOT NULL,
    "albumType" TEXT,
    "releaseDate" TEXT,
    "coverUrl" TEXT,
    "spotifyUrl" TEXT,
    "syncedAt" DATETIME NOT NULL,
    CONSTRAINT "ArtistReleaseCache_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "FollowedArtistCache" ("spotifyId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "lastSyncAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "error" TEXT
);

-- CreateIndex
CREATE INDEX "ArtistReleaseCache_artistId_idx" ON "ArtistReleaseCache"("artistId");

-- CreateIndex
CREATE INDEX "ArtistReleaseCache_releaseDate_idx" ON "ArtistReleaseCache"("releaseDate");
