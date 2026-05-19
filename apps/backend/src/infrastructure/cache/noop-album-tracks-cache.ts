import type { NormalizedTrack } from "@spotiarr/shared";
import type { AlbumTracksCachePort } from "@/application/ports/album-tracks-cache.port";

/**
 * No-op implementation of AlbumTracksCachePort.
 * Always returns a cache miss; set is a no-op.
 * This is the default wired in the container — no external dependency required.
 */
export class NoopAlbumTracksCache implements AlbumTracksCachePort {
  get(_artistId: string, _albumId: string): Promise<NormalizedTrack[] | null> {
    return Promise.resolve(null);
  }

  set(
    _artistId: string,
    _albumId: string,
    _tracks: NormalizedTrack[],
    _ttlSeconds?: number,
  ): Promise<void> {
    return Promise.resolve();
  }
}
