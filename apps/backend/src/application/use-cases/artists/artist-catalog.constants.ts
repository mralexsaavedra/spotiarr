export const ARTIST_DISCOGRAPHY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Maximum time the interactive artist-view path waits for Deezer / MusicBrainz
 * before falling back to Spotify. DB reads are unbounded by this timeout.
 */
export const INTERACTIVE_CATALOG_TIMEOUT_MS = 500;

/**
 * Returns true when the artist album cache is still within the TTL window.
 */
export function isArtistCacheFresh(syncedAt: Date | null): boolean {
  if (!syncedAt) return false;
  return Date.now() - syncedAt.getTime() <= ARTIST_DISCOGRAPHY_TTL_MS;
}
