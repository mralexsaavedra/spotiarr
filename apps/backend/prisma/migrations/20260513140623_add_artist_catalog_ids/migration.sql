-- AlterTable
ALTER TABLE "FollowedArtistCache" ADD COLUMN "deezerId" TEXT;
ALTER TABLE "FollowedArtistCache" ADD COLUMN "mbid" TEXT;

-- CreateIndex
CREATE INDEX "FollowedArtistCache_deezerId_idx" ON "FollowedArtistCache"("deezerId");

-- CreateIndex
CREATE INDEX "FollowedArtistCache_mbid_idx" ON "FollowedArtistCache"("mbid");
