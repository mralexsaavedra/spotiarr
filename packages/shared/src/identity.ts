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
