/**
 * Shared predicates for detecting the source provider of an album ID.
 *
 * Spotify album IDs are 22-character base-62 alphanumeric strings.
 * Deezer album IDs are purely numeric strings.
 * MusicBrainz release-group IDs are standard UUIDs.
 */

/**
 * Returns true when the given string is a Spotify album ID
 * (22-character alphanumeric base-62).
 */
export function isSpotifyAlbumId(id: string): boolean {
  return /^[a-zA-Z0-9]{22}$/.test(id);
}

/**
 * Returns true when the given string is a Deezer album ID
 * (numeric-only string).
 */
export function isDeezerAlbumId(id: string): boolean {
  return /^\d+$/.test(id);
}

/**
 * Returns true when the given string is a MusicBrainz release-group ID
 * (standard UUID pattern).
 */
export function isMusicBrainzId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
