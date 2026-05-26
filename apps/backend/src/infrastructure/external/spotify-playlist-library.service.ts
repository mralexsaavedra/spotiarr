import type { SpotifyPlaylist } from "@spotiarr/shared";
import type { SettingsService } from "@/application/services/settings.service";
import { AppError } from "@/domain/errors/app-error";
import { getEnv } from "../setup/environment";
import { getErrorMessage } from "../utils/error.utils";
import type { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyHttpClient, type SpotifyLimiterMode } from "./spotify-http.client";

const PLAYLIST_ACCESS_CACHE_MAX_ENTRIES = 1_000;
const PLAYLIST_ACCESS_ALLOWED_TTL_MS = 30 * 60 * 1000;
const PLAYLIST_ACCESS_DENIED_TTL_MS = 5 * 60 * 1000;
const PLAYLIST_ACCESS_RATE_LIMIT_FALLBACK_COOLDOWN_MS = 60 * 1000;

type SpotifyCurrentUserResponse = { id: string };
type PlaylistAccessStatus = "allowed" | "denied" | "rate_limited";
type PlaylistAccessResult = { status: PlaylistAccessStatus; trackTotal?: number };
type PlaylistAccessCacheEntry = {
  status: Exclude<PlaylistAccessStatus, "rate_limited">;
  trackTotal?: number;
  expiresAt: number;
};

export type SpotifyUserPlaylistItem = {
  id: string;
  name: string;
  collaborative?: boolean;
  images: { url: string }[];
  owner: { id?: string; display_name: string; external_urls: { spotify: string } };
  tracks?: { total?: number };
  external_urls: { spotify: string };
};

export const isOwnedPlaylist = (item: SpotifyUserPlaylistItem, currentUserId: string) =>
  item.owner?.id === currentUserId;

export const needsPlaylistItemsAccessCheck = (
  item: SpotifyUserPlaylistItem,
  currentUserId: string,
) => !isOwnedPlaylist(item, currentUserId);

export class SpotifyPlaylistLibraryService extends SpotifyHttpClient {
  private readonly playlistAccessCache = new Map<string, PlaylistAccessCacheEntry>();
  private playlistAccessProbeCooldownUntil = 0;

  constructor(
    private readonly settingsService: SettingsService,
    authService: SpotifyAuthService,
    limiterMode: SpotifyLimiterMode = "user",
  ) {
    super(authService, limiterMode);
  }

  clearCache(): void {
    this.playlistAccessCache.clear();
    this.playlistAccessProbeCooldownUntil = 0;
    this.log("Cache cleared");
  }

  private log(message: string, level: "debug" | "error" | "warn" = "debug") {
    const prefix = `[SpotifyPlaylistLibraryService]`;
    if (level === "error") console.error(prefix, message);
    else if (level === "warn") console.warn(prefix, message);
    else if (getEnv().NODE_ENV === "development") console.log(prefix, message);
  }

  private getPlaylistAccessCache(playlistId: string): PlaylistAccessResult | null {
    const entry = this.playlistAccessCache.get(playlistId);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this.playlistAccessCache.delete(playlistId);
      return null;
    }
    return { status: entry.status, trackTotal: entry.trackTotal };
  }

  private setPlaylistAccessCache(
    playlistId: string,
    status: Exclude<PlaylistAccessStatus, "rate_limited">,
    trackTotal?: number,
  ): void {
    const ttlMs =
      status === "allowed" ? PLAYLIST_ACCESS_ALLOWED_TTL_MS : PLAYLIST_ACCESS_DENIED_TTL_MS;
    this.playlistAccessCache.set(playlistId, {
      status,
      trackTotal,
      expiresAt: Date.now() + ttlMs,
    });
    this.prunePlaylistAccessCache();
  }

  private prunePlaylistAccessCache(): void {
    const now = Date.now();
    for (const [playlistId, entry] of this.playlistAccessCache) {
      if (now >= entry.expiresAt) this.playlistAccessCache.delete(playlistId);
    }
    while (this.playlistAccessCache.size > PLAYLIST_ACCESS_CACHE_MAX_ENTRIES) {
      const oldestKey = this.playlistAccessCache.keys().next().value;
      if (!oldestKey) break;
      this.playlistAccessCache.delete(oldestKey);
    }
  }

  private getRetryAfterMs(response: Response): number {
    const retryAfter = response.headers.get("Retry-After");
    if (!retryAfter) return PLAYLIST_ACCESS_RATE_LIMIT_FALLBACK_COOLDOWN_MS;

    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;

    const retryAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) {
      return Math.max(retryAt - Date.now(), PLAYLIST_ACCESS_RATE_LIMIT_FALLBACK_COOLDOWN_MS);
    }

    return PLAYLIST_ACCESS_RATE_LIMIT_FALLBACK_COOLDOWN_MS;
  }

  private isPlaylistAccessProbeCoolingDown(): boolean {
    return Date.now() < this.playlistAccessProbeCooldownUntil;
  }

  private async getCurrentUserId(): Promise<string> {
    const response = await this.fetchWithUserToken("https://api.spotify.com/v1/me");
    if (!response.ok) {
      if (response.status === 401) {
        throw new AppError(
          401,
          "missing_user_access_token",
          "Reconnect Spotify to grant the required playlist scopes.",
        );
      }
      if (response.status === 403) {
        throw new AppError(
          401,
          "missing_user_access_token",
          "Reconnect Spotify to grant the user-read-private scope.",
        );
      }
      const errorText = await response.text();
      throw new AppError(
        response.status,
        "internal_server_error",
        `Failed to fetch current Spotify user: ${response.status} ${errorText}`,
      );
    }
    const data = (await response.json()) as SpotifyCurrentUserResponse;
    return data.id;
  }

  private async canAccessPlaylistItems(playlistId: string): Promise<PlaylistAccessResult> {
    const cached = this.getPlaylistAccessCache(playlistId);
    if (cached) return cached;
    if (this.isPlaylistAccessProbeCoolingDown()) return { status: "rate_limited" };

    const fields = "total";
    const url = `https://api.spotify.com/v1/playlists/${playlistId}/items?limit=1&fields=${encodeURIComponent(fields)}`;
    const response = await this.fetchWithUserToken(url);

    if (response.ok) {
      const data = (await response.json()) as { total?: unknown };
      const trackTotal =
        typeof data.total === "number" && Number.isFinite(data.total) ? data.total : undefined;
      this.setPlaylistAccessCache(playlistId, "allowed", trackTotal);
      return { status: "allowed", trackTotal };
    }

    if (response.status === 403 || response.status === 404) {
      this.setPlaylistAccessCache(playlistId, "denied");
      return { status: "denied" };
    }

    if (response.status === 401) {
      throw new AppError(
        401,
        "missing_user_access_token",
        "Reconnect Spotify to grant the required playlist scopes.",
      );
    }

    if (response.status === 429) {
      const cooldownMs = this.getRetryAfterMs(response);
      this.playlistAccessProbeCooldownUntil = Date.now() + cooldownMs;
      this.log(
        `Spotify rate limited playlist access probes; cooling down for ${cooldownMs}ms`,
        "warn",
      );
      return { status: "rate_limited" };
    }

    const errorText = await response.text();
    throw new AppError(
      response.status >= 500 ? 502 : 500,
      "internal_server_error",
      `Failed to check playlist item access: ${response.status} ${errorText}`,
    );
  }

  private async getPlaylistVisibility(
    item: SpotifyUserPlaylistItem,
    currentUserId: string,
  ): Promise<PlaylistAccessResult> {
    if (isOwnedPlaylist(item, currentUserId)) return { status: "allowed" };
    return this.canAccessPlaylistItems(item.id);
  }

  async getMyPlaylists(): Promise<SpotifyPlaylist[]> {
    try {
      const currentUserId = await this.getCurrentUserId();
      const allPlaylists: SpotifyPlaylist[] = [];
      let nextUrl: string | null = "https://api.spotify.com/v1/me/playlists?limit=50";

      while (nextUrl) {
        const response = await this.fetchWithUserToken(nextUrl);
        if (!response.ok) {
          if (response.status === 401) {
            throw new AppError(
              401,
              "missing_user_access_token",
              "Reconnect Spotify to grant the required playlist scopes.",
            );
          }
          if (response.status === 403) {
            throw new AppError(
              401,
              "missing_user_access_token",
              "Reconnect Spotify to grant the user-read-private and playlist-read-private scopes.",
            );
          }
          const errorText = await response.text();
          throw new AppError(
            response.status,
            "internal_server_error",
            `Failed to fetch user playlists: ${response.status} ${errorText}`,
          );
        }

        const data = (await response.json()) as {
          items: SpotifyUserPlaylistItem[];
          next: string | null;
        };

        const accessibleItems: { item: SpotifyUserPlaylistItem; trackTotal?: number }[] = [];
        for (const item of data.items) {
          const visibility = await this.getPlaylistVisibility(item, currentUserId);
          if (visibility.status === "allowed") {
            accessibleItems.push({ item, trackTotal: visibility.trackTotal });
          }
        }

        const mapped = accessibleItems.map(({ item, trackTotal }) => {
          const playlistTrackTotal = item.tracks?.total;
          const tracks =
            typeof playlistTrackTotal === "number" && Number.isFinite(playlistTrackTotal)
              ? playlistTrackTotal
              : (trackTotal ?? 0);
          return {
            id: item.id,
            name: item.name,
            image: item.images?.[0]?.url ?? null,
            owner: item.owner?.display_name ?? "Unknown",
            tracks,
            spotifyUrl: item.external_urls?.spotify,
            ownerUrl: item.owner?.external_urls?.spotify,
          };
        });

        allPlaylists.push(...mapped);
        nextUrl = data.next;
      }

      return allPlaylists;
    } catch (error) {
      this.log(`Failed to get user playlists: ${getErrorMessage(error)}`);
      throw error;
    }
  }
}
