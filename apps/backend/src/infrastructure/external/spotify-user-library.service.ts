import type { ArtistRelease, FollowedArtist, SpotifyPlaylist } from "@spotiarr/shared";
import type { SpotifyUserLibraryPort } from "@/application/ports/spotify-user-library.port";
import type { SettingsService } from "@/application/services/settings.service";
import { AppError } from "@/domain/errors/app-error";
import { SpotifyArtistCatalogService } from "./spotify-artist-catalog.service";
import type { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyFollowedArtistsService } from "./spotify-followed-artists.service";
import { type SpotifyLimiterMode } from "./spotify-http.client";
import {
  isOwnedPlaylist,
  needsPlaylistItemsAccessCheck,
  SpotifyPlaylistLibraryService,
  type SpotifyUserPlaylistItem,
} from "./spotify-playlist-library.service";

export { isOwnedPlaylist, needsPlaylistItemsAccessCheck, type SpotifyUserPlaylistItem };

type SpotifyUserLibraryDependencies = {
  spotifyFollowedArtistsService: SpotifyFollowedArtistsService;
  spotifyPlaylistLibraryService: SpotifyPlaylistLibraryService;
  spotifyArtistCatalogService: SpotifyArtistCatalogService;
};

export class SpotifyUserLibraryService implements SpotifyUserLibraryPort {
  private static instance: SpotifyUserLibraryService | null = null;
  private static syncInstance: SpotifyUserLibraryService | null = null;

  private constructor(private readonly deps: SpotifyUserLibraryDependencies) {}

  // Compatibility bridge for existing tests during strangler phase.
  private get playlistAccessCache() {
    return (
      this.deps.spotifyPlaylistLibraryService as unknown as {
        playlistAccessCache: Map<string, { expiresAt: number }>;
      }
    ).playlistAccessCache;
  }

  static getInstance(
    settingsService?: SettingsService,
    authService?: SpotifyAuthService,
    limiterMode: SpotifyLimiterMode = "user",
    deps?: SpotifyUserLibraryDependencies,
  ): SpotifyUserLibraryService {
    const instanceKey = limiterMode === "sync" ? "syncInstance" : "instance";

    if (!SpotifyUserLibraryService[instanceKey]) {
      if (!settingsService || !authService) {
        throw new AppError(
          500,
          "internal_server_error",
          "SettingsService and SpotifyAuthService must be provided when initializing SpotifyUserLibraryService",
        );
      }

      SpotifyUserLibraryService[instanceKey] = new SpotifyUserLibraryService(
        deps ?? {
          spotifyFollowedArtistsService: new SpotifyFollowedArtistsService(
            settingsService,
            authService,
            limiterMode,
          ),
          spotifyPlaylistLibraryService: new SpotifyPlaylistLibraryService(
            settingsService,
            authService,
            limiterMode,
          ),
          spotifyArtistCatalogService: new SpotifyArtistCatalogService(
            settingsService,
            authService,
            limiterMode,
          ),
        },
      );
    }

    return SpotifyUserLibraryService[instanceKey] as SpotifyUserLibraryService;
  }

  static clearGlobalCache(): void {
    SpotifyUserLibraryService.instance?.clearCache();
    SpotifyUserLibraryService.syncInstance?.clearCache();
  }

  async getFollowedArtists(): Promise<FollowedArtist[]> {
    return this.deps.spotifyFollowedArtistsService.getFollowedArtists();
  }

  async getMyPlaylists(): Promise<SpotifyPlaylist[]> {
    return this.deps.spotifyPlaylistLibraryService.getMyPlaylists();
  }

  async getArtistCatalogData(
    artists: { id: string; name: string; imageUrl?: string | null }[],
    earlyStopBeforeDate?: Date,
  ): Promise<ArtistRelease[]> {
    return this.deps.spotifyArtistCatalogService.getArtistCatalogData(artists, earlyStopBeforeDate);
  }

  clearCache(): void {
    this.deps.spotifyFollowedArtistsService.clearCache();
    this.deps.spotifyPlaylistLibraryService.clearCache();
    this.deps.spotifyArtistCatalogService.clearCache();
  }
}
