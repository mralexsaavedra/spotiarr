/**
 * Port for lazy Spotify URL resolution.
 * Used by ResolveExternalUrlUseCase to look up Spotify URLs by entity name.
 * Implemented by SpotifyUrlLookupClient in infrastructure.
 */
export interface SpotifyUrlLookupPort {
  resolveArtistUrl(name: string): Promise<string | null>;
  resolveAlbumUrl(name: string, artistName?: string): Promise<string | null>;
  resolveTrackUrl(name: string, artistName?: string): Promise<string | null>;
}
