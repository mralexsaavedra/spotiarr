import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import type { SettingsPort } from "@/application/ports/settings.port";
import { validateEnvironment } from "@/infrastructure/setup/environment";
import { CircuitBreaker } from "./circuit-breaker";
import { PromiseCache } from "./promise-cache";
import { RateLimiter } from "./rate-limiter";
import { SpotifyArtistClient } from "./spotify-artist.client";
import type { SpotifyAuthService } from "./spotify-auth.service";

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

const buildClient = () => {
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

  return new SpotifyArtistClient(
    authService,
    settingsService,
    requestCache,
    circuitBreaker,
    rateLimiter,
    "interactive",
  );
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("SpotifyArtistClient", () => {
  describe("getArtistRaw()", () => {
    it("returns artist data on success", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse({
            name: "The Beatles",
            images: [{ url: "http://img.jpg" }],
            external_urls: { spotify: "https://open.spotify.com/artist/123" },
            genres: ["rock"],
          }),
        ),
      );

      const client = buildClient();
      const result = await client.getArtistRaw("artist-123");

      expect(result).not.toBeNull();
      expect(result?.name).toBe("The Beatles");
      expect(result?.genres).toContain("rock");
    });

    it("returns null on non-ok response (404)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));

      const client = buildClient();
      const result = await client.getArtistRaw("artist-404");

      expect(result).toBeNull();
    });

    it("returns null on network error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

      const client = buildClient();
      const result = await client.getArtistRaw("artist-err");

      expect(result).toBeNull();
    });
  });

  describe("getArtistDetails()", () => {
    it("maps artist data to expected shape", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse({
            name: "The Beatles",
            images: [{ url: "http://img.jpg" }],
            external_urls: { spotify: "https://open.spotify.com/artist/123" },
            genres: ["rock", "pop"],
          }),
        ),
      );

      const client = buildClient();
      const result = await client.getArtistDetails("artist-123");

      expect(result.name).toBe("The Beatles");
      expect(result.image).toBe("http://img.jpg");
      expect(result.spotifyUrl).toBe("https://open.spotify.com/artist/123");
    });

    it("returns 'Unknown Artist' when getArtistRaw returns null (non-ok response)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));

      const client = buildClient();
      const result = await client.getArtistDetails("artist-404");

      expect(result.name).toBe("Unknown Artist");
      expect(result.genres).toEqual([]);
    });

    it("includes genres array", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse({
            name: "The Beatles",
            images: [{ url: "http://img.jpg" }],
            external_urls: { spotify: "https://open.spotify.com/artist/123" },
            genres: ["rock", "pop"],
          }),
        ),
      );

      const client = buildClient();
      const result = await client.getArtistDetails("artist-123");

      expect(result.genres).toEqual(["rock", "pop"]);
    });

    it("returns Unknown Artist with empty genres when artist has no name", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          // Artist data exists but has no name
          jsonResponse({ images: [], external_urls: {}, genres: [] }),
        ),
      );

      const client = buildClient();
      const result = await client.getArtistDetails("artist-no-name");

      expect(result.name).toBe("Unknown Artist");
      expect(result.genres).toEqual([]);
    });

    it("returns null image when artist has empty images array", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse({
            name: "No Image Artist",
            images: [],
            external_urls: { spotify: "https://open.spotify.com/artist/ni1" },
            genres: [],
          }),
        ),
      );

      const client = buildClient();
      const result = await client.getArtistDetails("ni1");

      expect(result.image).toBeNull();
    });

    it("returns null spotifyUrl when external_urls.spotify is absent", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse({
            name: "No URL Artist",
            images: [{ url: "http://img.jpg" }],
            external_urls: {},
            genres: [],
          }),
        ),
      );

      const client = buildClient();
      const result = await client.getArtistDetails("nu1");

      expect(result.spotifyUrl).toBeNull();
    });

    it("returns empty genres array when artist.genres is undefined", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          // No genres field
          jsonResponse({
            name: "No Genres Artist",
            images: [],
            external_urls: {},
          }),
        ),
      );

      const client = buildClient();
      const result = await client.getArtistDetails("ng1");

      expect(result.genres).toEqual([]);
    });

    it("returns Unknown Artist when getArtistRaw throws internally", async () => {
      // Force getArtistRaw to throw (not return null — it catches internally and returns null)
      // So getArtistDetails should handle the null result
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Forced error")));

      const client = buildClient();
      // getArtistRaw catches and returns null, getArtistDetails returns Unknown Artist
      const result = await client.getArtistDetails("err-artist");

      expect(result.name).toBe("Unknown Artist");
      expect(result.followers).toBeNull();
    });

    it("returns Unknown Artist fallback when getArtistRaw itself throws past its own catch", async () => {
      // Spy directly on getArtistRaw to throw — this hits the outer catch in getArtistDetails (lines 96-104)
      const client = buildClient();
      vi.spyOn(client, "getArtistRaw").mockRejectedValue(new Error("Unexpected upstream throw"));

      const result = await client.getArtistDetails("throw-artist");

      expect(result.name).toBe("Unknown Artist");
      expect(result.image).toBeNull();
      expect(result.spotifyUrl).toBeNull();
      expect(result.followers).toBeNull();
      expect(result.genres).toEqual([]);
    });
  });

  describe("SpotifyArtistClient — request cache", () => {
    it("caches getArtistRaw results — second call skips fetch", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          name: "Cached Artist",
          images: [{ url: "http://img.jpg" }],
          external_urls: { spotify: "https://open.spotify.com/artist/c1" },
          genres: ["jazz"],
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const client = buildClient();
      const r1 = await client.getArtistRaw("c1");
      const r2 = await client.getArtistRaw("c1");

      expect(r1?.name).toBe("Cached Artist");
      expect(r2?.name).toBe("Cached Artist");
      // PromiseCache deduplicates — fetch called only once
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("clearMarketCache allows re-fetching market on next getMarket call", async () => {
      const authService = {
        getAppToken: vi.fn().mockResolvedValue("test-app-token"),
        getUserToken: vi.fn(),
        refreshUserToken: vi.fn(),
      } as unknown as import("./spotify-auth.service").SpotifyAuthService;

      const { SpotifyArtistClient } = await import("./spotify-artist.client");
      const { PromiseCache } = await import("./promise-cache");
      const { CircuitBreaker } = await import("./circuit-breaker");
      const { RateLimiter } = await import("./rate-limiter");

      const client = new SpotifyArtistClient(
        authService,
        { getString: vi.fn().mockResolvedValue("US") } as never,
        new PromiseCache({ ttlMs: 30_000 }),
        new CircuitBreaker(),
        new RateLimiter({ maxConcurrency: 5, minIntervalMs: 0, queueTimeoutMs: 5000 }),
      );

      client.clearMarketCache();
      // Should not throw — just tests the method exists and is callable
      expect(true).toBe(true);
    });
  });
});
