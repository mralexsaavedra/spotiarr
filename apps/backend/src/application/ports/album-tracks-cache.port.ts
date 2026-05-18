import type { NormalizedTrack } from "@spotiarr/shared";

/**
 * Optional short-circuit cache for album tracks.
 * Implementations can use Redis (TTL 300s) or any other store.
 * Default implementation is NoopAlbumTracksCache (always miss).
 */
export interface AlbumTracksCachePort {
  get(artistId: string, albumId: string): Promise<NormalizedTrack[] | null>;
  set(
    artistId: string,
    albumId: string,
    tracks: NormalizedTrack[],
    ttlSeconds?: number,
  ): Promise<void>;
}
