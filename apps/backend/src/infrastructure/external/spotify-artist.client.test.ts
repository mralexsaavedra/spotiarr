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
  });
});
