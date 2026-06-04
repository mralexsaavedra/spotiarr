import type { PlaylistPreviewTracksPage } from "@spotiarr/shared";
import {
  type PlaylistCachePort,
  PLAYLIST_CACHE_TTL_MS,
} from "@/application/ports/playlist-cache.port";
import type { SpotifyService } from "@/application/services/spotify.service";

const cacheKey = (spotifyUrl: string, offset: number, limit: number) =>
  `playlist-tracks:${spotifyUrl}:${offset}:${limit}`;

export class GetPlaylistPreviewTracksPageUseCase {
  constructor(
    private readonly spotifyService: SpotifyService,
    private readonly playlistCache: PlaylistCachePort,
  ) {}

  async execute(
    spotifyUrl: string,
    offset: number,
    limit: number,
  ): Promise<PlaylistPreviewTracksPage> {
    const key = cacheKey(spotifyUrl, offset, limit);

    try {
      const cached = await this.playlistCache.get<PlaylistPreviewTracksPage>(key);
      if (cached !== null) return cached;
    } catch (e) {
      console.error(
        "[GetPlaylistPreviewTracksPageUseCase] Cache get failed, proceeding without cache",
        e,
      );
    }

    const page = await this.spotifyService.getPlaylistTracksPage(spotifyUrl, offset, limit);

    const result: PlaylistPreviewTracksPage = {
      tracks: page.tracks.map((track) => ({
        name: track.name,
        artists: track.artists?.map((a) => ({ name: a.name, url: a.url })) || [
          { name: track.artist, url: undefined },
        ],
        album: track.album || "Unknown Album",
        duration: track.durationMs || 0,
        trackUrl: track.trackUrl,
        albumUrl: track.albumUrl,
      })),
      total: page.total,
      hasMore: page.hasMore,
      nextOffset: page.nextOffset,
    };

    try {
      await this.playlistCache.set(key, result, PLAYLIST_CACHE_TTL_MS);
    } catch (e) {
      console.error("[GetPlaylistPreviewTracksPageUseCase] Cache set failed (non-blocking)", e);
    }

    return result;
  }
}
