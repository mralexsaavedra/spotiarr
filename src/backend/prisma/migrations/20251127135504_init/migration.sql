-- CreateTable
CREATE TABLE "Playlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "type" TEXT,
    "spotifyUrl" TEXT NOT NULL,
    "error" TEXT,
    "subscribed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" BIGINT NOT NULL DEFAULT 0,
    "coverUrl" TEXT,
    "artistImageUrl" TEXT
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artist" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "album" TEXT,
    "albumYear" INTEGER,
    "trackNumber" INTEGER,
    "spotifyUrl" TEXT,
    "trackUrl" TEXT,
    "albumCoverUrl" TEXT,
    "primaryArtistImageUrl" TEXT,
    "artists" JSONB,
    "youtubeUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'New',
    "error" TEXT,
    "createdAt" BIGINT NOT NULL DEFAULT 0,
    "completedAt" BIGINT,
    "playlistId" TEXT,
    CONSTRAINT "Track_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" BIGINT NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "DownloadHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playlistId" TEXT,
    "trackId" TEXT,
    "playlistName" TEXT NOT NULL,
    "playlistSpotifyUrl" TEXT,
    "trackName" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "album" TEXT,
    "trackUrl" TEXT,
    "completedAt" BIGINT NOT NULL,
    "createdAt" BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT "DownloadHistory_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DownloadHistory_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");
