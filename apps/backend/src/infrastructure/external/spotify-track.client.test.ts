import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import type { SettingsPort } from "@/application/ports/settings.port";
import { AppError } from "@/domain/errors/app-error";
import { validateEnvironment } from "@/infrastructure/setup/environment";
import { CircuitBreaker } from "./circuit-breaker";
import { PromiseCache } from "./promise-cache";
import { RateLimiter } from "./rate-limiter";
import type { SpotifyAuthService } from "./spotify-auth.service";
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

const buildClient = (requestCache?: PromiseCache) => {
  const authService = {
    getAppToken: vi.fn().mockResolvedValue("test-app-token"),
    getUserToken: vi.fn(),
    refreshUserToken: vi.fn(),
  } as unknown as SpotifyAuthService;

  const settingsService = {
    getString: vi.fn().mockResolvedValue("US"),
  } as unknown as SettingsPort;

  const circuitBreaker = new CircuitBreaker();
  const rateLimiter = new RateLimiter({
    maxConcurrency: 5,
    minIntervalMs: 0,
    queueTimeoutMs: 5000,
  });

  return new SpotifyTrackClient(
    authService,
    settingsService,
    circuitBreaker,
    rateLimiter,
    "interactive",
    requestCache,
  );
};

const makeTrackPayload = (overrides?: Record<string, unknown>) => ({
  name: "Test Track",
  artists: [{ name: "Artist", external_urls: { spotify: "https://spotify.com/artist/1" } }],
  album: {
    name: "Test Album",
    images: [{ url: "http://cover.jpg" }],
    release_date: "2020-01-01",
    total_tracks: 10,
  },
  preview_url: "http://preview.mp3",
  duration_ms: 180000,
  track_number: 1,
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("SpotifyTrackClient", () => {
  describe("getTrackDetails()", () => {
    it("returns NormalizedTrack on success", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(makeTrackPayload())));

      const client = buildClient();
      const result = await client.getTrackDetails("track-1");

      expect(result.name).toBe("Test Track");
      expect(result.artist).toBe("Artist");
      expect(result.album).toBe("Test Album");
    });

    it("throws AppError(404) on 404", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));

      const client = buildClient();

      await expect(client.getTrackDetails("track-404")).rejects.toMatchObject({
        statusCode: 404,
        errorCode: "track_not_found",
      });
    });

    it("throws AppError('spotify_rate_limited') when fetch returns 429", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response("Retry-After: 60", {
            status: 429,
            headers: { "Retry-After": "60" },
          }),
        ),
      );

      const client = buildClient();

      await expect(client.getTrackDetails("track-429")).rejects.toMatchObject({
        errorCode: "spotify_rate_limited",
      });
    });

    it("throws AppError on 500", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

      const client = buildClient();

      await expect(client.getTrackDetails("track-500")).rejects.toBeInstanceOf(AppError);
    });

    it("calls fetch only once for the same track id (caching)", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(makeTrackPayload()));
      vi.stubGlobal("fetch", fetchMock);

      const sharedCache = new PromiseCache({ ttlMs: 30_000 });
      const client = buildClient(sharedCache);

      await client.getTrackDetails("track-1");
      await client.getTrackDetails("track-1");

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
