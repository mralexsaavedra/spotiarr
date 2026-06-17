import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { SettingsPort } from "@/application/ports/settings.port";
import { AppError } from "@/domain/errors/app-error";
import { validateEnvironment } from "@/infrastructure/setup/environment";
import { CircuitBreaker } from "./circuit-breaker";
import { PromiseCache } from "./promise-cache";
import { RateLimiter } from "./rate-limiter";
import { SpotifyAlbumClient } from "./spotify-album.client";
import { SpotifyAuthService } from "./spotify-auth.service";

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

describe("SpotifyAlbumClient", () => {
  let client: SpotifyAlbumClient;

  beforeEach(() => {
    const authService = {
      getAppToken: vi.fn().mockResolvedValue("test-app-token"),
      getUserToken: vi.fn(),
      refreshUserToken: vi.fn(),
    } as unknown as SpotifyAuthService;

    const settingsService = {
      getString: vi.fn().mockResolvedValue("US"),
    } as unknown as SettingsPort;

    const requestCache = new PromiseCache({ ttlMs: 30_000 });
    const circuitBreaker = new CircuitBreaker();
    const rateLimiter = new RateLimiter({
      maxConcurrency: 5,
      minIntervalMs: 0,
      queueTimeoutMs: 5000,
    });

    client = new SpotifyAlbumClient(
      authService,
      settingsService,
      requestCache,
      circuitBreaker,
      rateLimiter,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("getAlbumDetails()", () => {
    it("fetches album by id and returns parsed JSON", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse({ name: "Test Album", id: "abc123" })),
      );

      const result = await client.getAlbumDetails("abc123");

      expect(result.name).toBe("Test Album");
    });

    it("throws AppError(404) with errorCode album_not_found on 404", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));

      await expect(client.getAlbumDetails("missing-id")).rejects.toMatchObject({
        statusCode: 404,
        errorCode: "album_not_found",
      });
    });

    it("throws AppError on non-ok status other than 404", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

      await expect(client.getAlbumDetails("error-id")).rejects.toBeInstanceOf(AppError);
    });
  });

  describe("getAlbumTracks()", () => {
    it("returns NormalizedTracks for a single-page album", async () => {
      const albumBody = {
        id: "album-1",
        name: "Album",
        images: [{ url: "http://img" }],
        artists: [{ name: "Artist" }],
        release_date: "2020-01-01",
        total_tracks: 1,
      };

      const tracksBody = {
        items: [
          {
            name: "Track 1",
            artists: [{ name: "Artist" }],
            external_urls: { spotify: "https://open.spotify.com/track/1" },
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
        next: null,
      };

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(jsonResponse(albumBody))
          .mockResolvedValueOnce(jsonResponse(tracksBody)),
      );

      const tracks = await client.getAlbumTracks("album-1");

      expect(tracks.length).toBe(1);
      expect(tracks[0].name).toBe("Track 1");
      expect(tracks[0].album).toBe("Album");
    });

    it("handles pagination and accumulates tracks from multiple pages", async () => {
      const albumBody = {
        id: "album-2",
        name: "Big Album",
        images: [],
        artists: [{ name: "Band" }],
        release_date: "2021-06-01",
        total_tracks: 2,
      };

      const tracksPage1 = {
        items: [{ name: "Track A", artists: [{ name: "Band" }] }],
        total: 2,
        limit: 50,
        offset: 0,
        next: "https://api.spotify.com/v1/albums/album-2/tracks?limit=50&offset=50",
      };

      const tracksPage2 = {
        items: [{ name: "Track B", artists: [{ name: "Band" }] }],
        total: 2,
        limit: 50,
        offset: 50,
        next: null,
      };

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(jsonResponse(albumBody))
          .mockResolvedValueOnce(jsonResponse(tracksPage1))
          .mockResolvedValueOnce(jsonResponse(tracksPage2)),
      );

      const tracks = await client.getAlbumTracks("album-2");

      expect(tracks.length).toBe(2);
      expect(tracks[0].name).toBe("Track A");
      expect(tracks[1].name).toBe("Track B");
    });

    it("throws AppError(404) when album not found", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));

      await expect(client.getAlbumTracks("not-found")).rejects.toMatchObject({
        statusCode: 404,
        errorCode: "album_not_found",
      });
    });

    it("throws AppError(429) when tracks page returns 429", async () => {
      const albumBody = {
        id: "album-rl",
        name: "Rate Limited Album",
        images: [],
        artists: [{ name: "Artist" }],
        release_date: "2020-01-01",
        total_tracks: 1,
      };

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(
            new Response(JSON.stringify(albumBody), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          )
          .mockResolvedValueOnce(
            new Response("", { status: 429, headers: { "Retry-After": "1" } }),
          ),
      );

      await expect(client.getAlbumTracks("album-rl")).rejects.toMatchObject({
        statusCode: 429,
        errorCode: "spotify_rate_limited",
      });
    });

    it("throws AppError on non-404/non-429 error from tracks page", async () => {
      const albumBody = {
        id: "album-err",
        name: "Error Album",
        images: [],
        artists: [{ name: "Artist" }],
        release_date: "2020-01-01",
        total_tracks: 1,
      };

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(
            new Response(JSON.stringify(albumBody), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          )
          .mockResolvedValueOnce(new Response("", { status: 500 })),
      );

      await expect(client.getAlbumTracks("album-err")).rejects.toMatchObject({
        statusCode: 500,
        errorCode: "internal_server_error",
      });
    });

    it("throws AppError(404) when tracks page is 404", async () => {
      const albumBody = {
        id: "album-404",
        name: "Gone Album",
        images: [],
        artists: [{ name: "Artist" }],
        release_date: "2020-01-01",
        total_tracks: 1,
      };

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(
            new Response(JSON.stringify(albumBody), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          )
          .mockResolvedValueOnce(new Response("", { status: 404 })),
      );

      await expect(client.getAlbumTracks("album-404")).rejects.toMatchObject({
        statusCode: 404,
        errorCode: "album_not_found",
      });
    });
  });
});
