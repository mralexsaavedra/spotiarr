import { SpotifyPlaylist } from "@spotiarr/shared";
import {
  type PlaylistCachePort,
  PLAYLIST_CACHE_TTL_MS,
} from "@/application/ports/playlist-cache.port";
import { SpotifyService } from "@/application/services/spotify.service";

const MY_PLAYLISTS_CACHE_KEY = "my-playlists:default";

export class GetMyPlaylistsUseCase {
  constructor(
    private readonly spotifyService: SpotifyService,
    private readonly playlistCache: PlaylistCachePort,
  ) {}

  async execute(): Promise<SpotifyPlaylist[]> {
    try {
      const cached = await this.playlistCache.get<SpotifyPlaylist[]>(MY_PLAYLISTS_CACHE_KEY);
      if (cached !== null) return cached;
    } catch (e) {
      console.error("[GetMyPlaylistsUseCase] Cache get failed, proceeding without cache", e);
    }

    const result = await this.spotifyService.getMyPlaylists();

    try {
      await this.playlistCache.set(MY_PLAYLISTS_CACHE_KEY, result, PLAYLIST_CACHE_TTL_MS);
    } catch (e) {
      console.error("[GetMyPlaylistsUseCase] Cache set failed (non-blocking)", e);
    }

    return result;
  }
}
