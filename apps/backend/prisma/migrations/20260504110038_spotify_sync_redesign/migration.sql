-- AlterTable
ALTER TABLE "FollowedArtistCache" ADD COLUMN "lastCatalogSyncAt" DATETIME;
ALTER TABLE "FollowedArtistCache" ADD COLUMN "lastReleasesSyncAt" DATETIME;
