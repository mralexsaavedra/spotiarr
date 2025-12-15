-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artist" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "album" TEXT,
    "albumYear" INTEGER,
    "trackNumber" INTEGER,
    "durationMs" INTEGER,
    "spotifyUrl" TEXT,
    "trackUrl" TEXT,
    "albumUrl" TEXT,
    "albumCoverUrl" TEXT,
    "primaryArtistImageUrl" TEXT,
    "artists" TEXT,
    "youtubeUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'New',
    "error" TEXT,
    "createdAt" BIGINT NOT NULL DEFAULT 0,
    "completedAt" BIGINT,
    "playlistIndex" INTEGER,
    "playlistId" TEXT,
    CONSTRAINT "Track_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Track" ("album", "albumCoverUrl", "albumUrl", "albumYear", "artist", "artists", "completedAt", "createdAt", "durationMs", "error", "id", "name", "playlistId", "primaryArtistImageUrl", "spotifyUrl", "status", "trackNumber", "trackUrl", "youtubeUrl") SELECT "album", "albumCoverUrl", "albumUrl", "albumYear", "artist", "artists", "completedAt", "createdAt", "durationMs", "error", "id", "name", "playlistId", "primaryArtistImageUrl", "spotifyUrl", "status", "trackNumber", "trackUrl", "youtubeUrl" FROM "Track";
DROP TABLE "Track";
ALTER TABLE "new_Track" RENAME TO "Track";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
