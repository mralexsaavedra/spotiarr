import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import type { SettingsPort } from "@/application/ports/settings.port";
import { AppError } from "@/domain/errors/app-error";
import { validateEnvironment } from "@/infrastructure/setup/environment";
import { CircuitBreaker } from "./circuit-breaker";
import { PromiseCache } from "./promise-cache";
import { RateLimiter } from "./rate-limiter";
import { SpotifyAlbumClient } from "./spotify-album.client";
import { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyPlaylistClient } from "./spotify-playlist.client";
import { SpotifyTrackClient } from "./spotify-track.client";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

beforeAll(() => {
  process.env.SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID ?? "test-client-id";
  process.env.SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET ?? "test-client-secret";
  process.env.SPOTIFY_REDIRECT_URI =
    process.env.SPOTIFY_REDIRECT_URI ?? "http://localhost:3000/auth/spotify/callback";
  validateEnvironment();
});

describe("SpotifyPlaylistClient", () => {
  let authService: SpotifyAuthService;
  let settingsService: SettingsPort;
  let circuitBreaker: CircuitBreaker;
  let rateLimiter: RateLimiter;
  let requestCache: PromiseCache;
  let mockTrackClient: SpotifyTrackClient;
  let mockAlbumClient: SpotifyAlbumClient;
  let client: SpotifyPlaylistClient;

  beforeEach(() => {
    authService = {
      getAppToken: vi.fn().mockResolvedValue("test-app-token"),
      getUserToken: vi.fn().mockResolvedValue("test-user-token"),
      refreshUserToken: vi.fn().mockResolvedValue(false),
    } as unknown as SpotifyAuthService;
    settingsService = {
      getString: vi.fn().mockResolvedValue("US"),
    } as unknown as SettingsPort;
    circuitBreaker = new CircuitBreaker();
    rateLimiter = new RateLimiter({ maxConcurrency: 5, minIntervalMs: 0, queueTimeoutMs: 5000 });
    requestCache = new PromiseCache({ ttlMs: 30_000 });
    mockTrackClient = { getTrackDetails: vi.fn() } as unknown as SpotifyTrackClient;
    mockAlbumClient = { getAlbumTracks: vi.fn() } as unknown as SpotifyAlbumClient;
    client = new SpotifyPlaylistClient(
      authService,
      settingsService,
      mockTrackClient,
      mockAlbumClient,
      requestCache,
      circuitBreaker,
      rateLimiter,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("getPlaylistMetadata()", () => {
    it("returns metadata on success when app token works", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse({
            name: "My Playlist",
            images: [{ url: "http://cover.jpg" }],
            owner: {
              display_name: "User",
              external_urls: { spotify: "https://spotify.com/user" },
            },
            tracks: { total: 42 },
          }),
        ),
      );

      const result = await client.getPlaylistMetadata("https://open.spotify.com/playlist/abc123");

      expect(result.name).toBe("My Playlist");
      expect(result.image).toBe("http://cover.jpg");
      expect(result.owner).toBe("User");
      expect(result.totalTracks).toBe(42);
    });

    it("falls back to user token when app token returns 404", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(new Response("", { status: 404 }))
          .mockResolvedValueOnce(
            jsonResponse({
              name: "Private Playlist",
              images: [],
              owner: { display_name: "Private User" },
              tracks: { total: 5 },
            }),
          ),
      );

      const result = await client.getPlaylistMetadata("https://open.spotify.com/playlist/abc123");

      expect(result.name).toBe("Private Playlist");
    });

    it("throws AppError(404) with errorCode playlist_not_found if both tokens get 404", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));

      await expect(
        client.getPlaylistMetadata("https://open.spotify.com/playlist/abc123"),
      ).rejects.toMatchObject({ errorCode: "playlist_not_found" });
    });

    it("throws AppError on 500", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

      await expect(
        client.getPlaylistMetadata("https://open.spotify.com/playlist/abc123"),
      ).rejects.toBeInstanceOf(AppError);
    });
  });

  describe("getAllPlaylistTracks()", () => {
    it("returns single track for track URL", async () => {
      vi.mocked(mockTrackClient.getTrackDetails).mockResolvedValue({
        name: "Track",
        artist: "Artist",
        artists: [{ name: "Artist" }],
      } as never);

      const tracks = await client.getAllPlaylistTracks("https://open.spotify.com/track/abc123");

      expect(tracks).toHaveLength(1);
    });

    it("returns album tracks for album URL", async () => {
      vi.mocked(mockAlbumClient.getAlbumTracks).mockResolvedValue([
        {
          name: "Album Track",
          artist: "Artist",
          artists: [{ name: "Artist" }],
          album: "Album",
        } as never,
      ]);

      const tracks = await client.getAllPlaylistTracks("https://open.spotify.com/album/abc123");

      expect(tracks).toHaveLength(1);
      expect(tracks[0].name).toBe("Album Track");
    });

    it("returns paginated playlist tracks for playlist URL", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse({
            items: [
              {
                item: {
                  name: "Playlist Track",
                  artists: [{ name: "Artist" }],
                  external_urls: {},
                  album: {
                    name: "Album",
                    images: [],
                    release_date: "2020",
                    total_tracks: 10,
                  },
                },
              },
            ],
            next: null,
          }),
        ),
      );

      const tracks = await client.getAllPlaylistTracks("https://open.spotify.com/playlist/abc123");

      expect(tracks).toHaveLength(1);
      expect(tracks[0].name).toBe("Playlist Track");
    });

    it("filters null items from playlist response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse({
            items: [
              { item: null },
              {
                item: {
                  name: "Valid Track",
                  artists: [{ name: "Artist" }],
                  external_urls: {},
                  album: {
                    name: "Album",
                    images: [],
                    release_date: "2020",
                    total_tracks: 1,
                  },
                },
              },
            ],
            next: null,
          }),
        ),
      );

      const tracks = await client.getAllPlaylistTracks("https://open.spotify.com/playlist/abc123");

      expect(tracks).toHaveLength(1);
    });

    it("falls back to app token when user token throws missing_user_access_token", async () => {
      vi.mocked(authService.getUserToken).mockRejectedValue(
        new AppError(401, "missing_user_access_token", "No user token"),
      );
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse({
            items: [
              {
                item: {
                  name: "Fallback Track",
                  artists: [{ name: "Artist" }],
                  external_urls: {},
                  album: {
                    name: "Album",
                    images: [],
                    release_date: "2020",
                    total_tracks: 1,
                  },
                },
              },
            ],
            next: null,
          }),
        ),
      );

      const tracks = await client.getAllPlaylistTracks("https://open.spotify.com/playlist/abc123");

      expect(tracks).toHaveLength(1);
    });

    it("throws AppError(403) with errorCode playlist_not_accessible on 403", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 403 })));

      await expect(
        client.getAllPlaylistTracks("https://open.spotify.com/playlist/abc123"),
      ).rejects.toMatchObject({ errorCode: "playlist_not_accessible" });
    });

    it("returns empty array for unrecognized URL type", async () => {
      const tracks = await client.getAllPlaylistTracks("https://open.spotify.com/show/abc123");

      expect(tracks).toEqual([]);
    });
  });

  describe("getPlaylistTracksPage()", () => {
    it("returns empty page for non-playlist URLs", async () => {
      const result = await client.getPlaylistTracksPage(
        "https://open.spotify.com/album/abc",
        0,
        10,
      );

      expect(result).toEqual({
        tracks: [],
        total: 0,
        hasMore: false,
        nextOffset: null,
      });
    });

    it("returns tracks and pagination info on success", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse({
            items: [
              {
                item: {
                  name: "Page Track",
                  artists: [{ name: "A" }],
                  external_urls: {},
                  album: {
                    name: "X",
                    images: [],
                    release_date: "2020",
                    total_tracks: 5,
                  },
                },
              },
            ],
            next: "https://api.spotify.com/v1/playlists/abc/items?offset=100&limit=50",
            total: 150,
          }),
        ),
      );

      const result = await client.getPlaylistTracksPage(
        "https://open.spotify.com/playlist/abc",
        50,
        50,
      );

      expect(result.tracks).toHaveLength(1);
      expect(result.total).toBe(150);
      expect(result.hasMore).toBe(true);
      expect(result.nextOffset).toBe(100);
    });

    it("returns hasMore=false when next is null", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse({ items: [], next: null, total: 0 })),
      );

      const result = await client.getPlaylistTracksPage(
        "https://open.spotify.com/playlist/abc",
        0,
        10,
      );

      expect(result.hasMore).toBe(false);
      expect(result.nextOffset).toBeNull();
    });

    it("throws AppError(404) on 404", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));

      await expect(
        client.getPlaylistTracksPage("https://open.spotify.com/playlist/abc", 0, 10),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
