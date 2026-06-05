-- AddUniqueConstraint on Playlist.spotifyUrl
-- Pre-flight: verify no duplicate spotifyUrl values exist before applying.
-- Run the query below against your database first:
--   SELECT spotifyUrl, COUNT(*) c FROM Playlist GROUP BY spotifyUrl HAVING c > 1;
-- If empty: apply cleanly. If non-empty: deduplicate (delete or merge) before running this migration.

-- CreateIndex
CREATE UNIQUE INDEX "Playlist_spotifyUrl_key" ON "Playlist"("spotifyUrl");
