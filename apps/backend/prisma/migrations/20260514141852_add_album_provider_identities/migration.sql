-- AlterTable
ALTER TABLE "ArtistAlbumCache" ADD COLUMN "deezerAlbumId" TEXT;
ALTER TABLE "ArtistAlbumCache" ADD COLUMN "mbAlbumId" TEXT;

-- CreateIndex
CREATE INDEX "ArtistAlbumCache_deezerAlbumId_idx" ON "ArtistAlbumCache"("deezerAlbumId");

-- CreateIndex
CREATE INDEX "ArtistAlbumCache_mbAlbumId_idx" ON "ArtistAlbumCache"("mbAlbumId");
