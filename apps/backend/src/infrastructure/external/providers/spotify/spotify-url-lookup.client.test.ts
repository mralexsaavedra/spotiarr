import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import type { SettingsPort } from "@/application/ports/settings.port";
import { validateEnvironment } from "@/infrastructure/setup/environment";
import { CircuitBreaker } from "../../circuit-breaker";
import { RateLimiter } from "../../rate-limiter";
import { SpotifyAuthService } from "../../spotify-auth.service";
import { SpotifyUrlLookupClient } from "./spotify-url-lookup.client";

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

describe("SpotifyUrlLookupClient", () => {
  let authService: SpotifyAuthService;
  let settingsService: SettingsPort;
  let circuitBreaker: CircuitBreaker;
  let rateLimiter: RateLimiter;
  let client: SpotifyUrlLookupClient;

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
    client = new SpotifyUrlLookupClient(authService, settingsService, circuitBreaker, rateLimiter);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("resolveArtistUrl()", () => {
    it("returns spotify URL from first result", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse({
            artists: {
              items: [{ external_urls: { spotify: "https://open.spotify.com/artist/123" } }],
            },
          }),
        ),
      );

      const result = await client.resolveArtistUrl("The Beatles");

      expect(result).toBe("https://open.spotify.com/artist/123");
    });

    it("returns null when items is empty", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ artists: { items: [] } })));

      const result = await client.resolveArtistUrl("Nonexistent Artist");

      expect(result).toBeNull();
    });

    it("returns null on network error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network failed")));

      const result = await client.resolveArtistUrl("Any Artist");

      expect(result).toBeNull();
    });
  });

  describe("resolveAlbumUrl()", () => {
    it("builds query as 'name artistName' when artist is provided", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          albums: {
            items: [{ external_urls: { spotify: "https://open.spotify.com/album/456" } }],
          },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const result = await client.resolveAlbumUrl("Dark Side", "Pink Floyd");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("Dark");
      expect(calledUrl).toContain("Pink");
      expect(result).toBe("https://open.spotify.com/album/456");
    });

    it("uses just name when no artist provided", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          albums: {
            items: [{ external_urls: { spotify: "https://open.spotify.com/album/789" } }],
          },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const result = await client.resolveAlbumUrl("Dark Side");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("Dark");
      expect(calledUrl).not.toContain("Pink");
      expect(result).toBe("https://open.spotify.com/album/789");
    });
  });

  describe("resolveTrackUrl()", () => {
    it("returns spotify URL for track", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse({
            tracks: {
              items: [{ external_urls: { spotify: "https://open.spotify.com/track/abc" } }],
            },
          }),
        ),
      );

      const result = await client.resolveTrackUrl("Bohemian Rhapsody", "Queen");

      expect(result).toBe("https://open.spotify.com/track/abc");
    });

    it("returns null when API returns non-ok response", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 400 })));

      const result = await client.resolveTrackUrl("Some Track");

      expect(result).toBeNull();
    });
  });
});
