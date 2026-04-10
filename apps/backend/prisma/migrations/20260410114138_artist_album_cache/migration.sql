-- CreateTable
CREATE TABLE "ArtistAlbumCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spotifyArtistId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "albumName" TEXT NOT NULL,
    "albumType" TEXT,
    "releaseDate" TEXT,
    "coverUrl" TEXT,
    "spotifyUrl" TEXT,
    "totalTracks" INTEGER,
    "syncedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ArtistAlbumCache_spotifyArtistId_idx" ON "ArtistAlbumCache"("spotifyArtistId");

-- CreateIndex
CREATE INDEX "ArtistAlbumCache_releaseDate_idx" ON "ArtistAlbumCache"("releaseDate");

-- CreateIndex
CREATE INDEX "ArtistAlbumCache_spotifyArtistId_releaseDate_idx" ON "ArtistAlbumCache"("spotifyArtistId", "releaseDate");
