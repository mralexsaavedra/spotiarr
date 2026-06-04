import type { PlaylistPreview } from "@spotiarr/shared";
import {
  type PlaylistCachePort,
  PLAYLIST_CACHE_TTL_MS,
} from "@/application/ports/playlist-cache.port";
import { SpotifyService } from "@/application/services/spotify.service";

const cacheKey = (spotifyUrl: string) => `preview::${spotifyUrl}`;

export class GetPlaylistPreviewUseCase {
  constructor(
    private readonly spotifyService: SpotifyService,
    private readonly playlistCache: PlaylistCachePort,
  ) {}

  async execute(spotifyUrl: string): Promise<PlaylistPreview> {
    const key = cacheKey(spotifyUrl);

    try {
      const cached = await this.playlistCache.get<PlaylistPreview>(key);
      if (cached !== null) return cached;
    } catch (e) {
      console.error("[GetPlaylistPreviewUseCase] Cache get failed, proceeding without cache", e);
    }

    const details = await this.spotifyService.getPlaylistDetail(spotifyUrl, true);

    const result: PlaylistPreview = {
      name: details.name,
      type: details.type,
      description: null,
      coverUrl: details.image || null,
      tracks: details.tracks.map((track) => ({
        name: track.name,
        artists: track.artists?.map((a) => ({ name: a.name, url: a.url })) || [
          { name: track.artist, url: undefined },
        ],
        album: track.album || "Unknown Album",
        duration: track.durationMs || 0,
        trackUrl: track.trackUrl,
        albumUrl: track.albumUrl,
      })),
      totalTracks: details.tracks.length,
      owner: details.owner,
      ownerUrl: details.ownerUrl,
    };

    try {
      await this.playlistCache.set(key, result, PLAYLIST_CACHE_TTL_MS);
    } catch (e) {
      console.error("[GetPlaylistPreviewUseCase] Cache set failed (non-blocking)", e);
    }

    return result;
  }
}
