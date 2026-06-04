/**
 * Identity helpers for distinguishing Spotify IDs from Deezer IDs.
 *
 * Spotify IDs are base62-encoded strings of exactly 22 characters.
 * Deezer IDs are numeric strings (integer values).
 *
 * These are the canonical detection functions for the dual-ID strategy (Design D1).
 * All code that needs to dispatch between Spotify and Deezer identifiers MUST
 * import from this module rather than defining local regex constants.
 */

/** Returns true when id matches the Spotify artist/album/track ID format (base62, 22 chars). */
export const isSpotifyArtistId = (id: string): boolean => /^[0-9A-Za-z]{22}$/.test(id);

/** Returns true when id matches the Deezer entity ID format (numeric string). */
export const isDeezerArtistId = (id: string): boolean => /^\d+$/.test(id);

/** Alias for isSpotifyArtistId — albums share the same base62-22 format. */
export const isSpotifyAlbumId = (id: string): boolean => /^[0-9A-Za-z]{22}$/.test(id);

/**
 * Returns true when the URL originates from the Deezer API or website.
 * Matches both api.deezer.com and www.deezer.com origins.
 * Safe to call with null or undefined — returns false for non-string values.
 */
export const isDeezerUrl = (url: string | null | undefined): boolean =>
  typeof url === "string" && /^https?:\/\/(api|www)\.deezer\.com\//.test(url);

/**
 * Extracts the numeric track id from a Deezer track URL.
 * Returns the id string (e.g. "12345") or null when the URL does not contain a /track/<id> segment.
 *
 * Example: "https://api.deezer.com/track/12345" → "12345"
 */
export const extractDeezerTrackId = (url: string): string | null => {
  const match = url.match(/\/track\/(\d+)/);
  return match ? match[1] : null;
};
