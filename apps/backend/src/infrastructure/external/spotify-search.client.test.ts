import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import type { SettingsPort } from "@/application/ports/settings.port";
import { AppError } from "@/domain/errors/app-error";
import { validateEnvironment } from "@/infrastructure/setup/environment";
import { CircuitBreaker } from "./circuit-breaker";
import { PromiseCache } from "./promise-cache";
import { RateLimiter } from "./rate-limiter";
import { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifySearchClient } from "./spotify-search.client";

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

describe("SpotifySearchClient", () => {
  let authService: SpotifyAuthService;
  let settingsService: SettingsPort;
  let circuitBreaker: CircuitBreaker;
  let rateLimiter: RateLimiter;
  let requestCache: PromiseCache;

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
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("searchCatalog()", () => {
    it("returns empty result when query is blank string", async () => {
      const client = new SpotifySearchClient(
        authService,
        settingsService,
        requestCache,
        circuitBreaker,
        rateLimiter,
      );
      const result = await client.searchCatalog("");
      expect(result).toEqual({ tracks: [], albums: [], artists: [] });
      expect(vi.mocked(authService.getAppToken)).not.toHaveBeenCalled();
    });

    it("returns empty result when query is whitespace", async () => {
      const client = new SpotifySearchClient(
        authService,
        settingsService,
        requestCache,
        circuitBreaker,
        rateLimiter,
      );
      const result = await client.searchCatalog("   ");
      expect(result).toEqual({ tracks: [], albums: [], artists: [] });
      expect(vi.mocked(authService.getAppToken)).not.toHaveBeenCalled();
    });

    it("returns tracks from Spotify response", async () => {
      // searchCatalog groups types by limit: default artist=5, track+album=10 → 2 search requests
      // (order is non-deterministic due to Promise.all). Then getArtistImagesBatch fires a 3rd
      // request. Use mockImplementation to route by URL rather than call order.
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/v1/artists?ids=")) {
          return Promise.resolve(
            jsonResponse({ artists: [{ id: "a1", images: [{ url: "http://artist.jpg" }] }] }),
          );
        }
        if (url.includes("type=track")) {
          return Promise.resolve(
            jsonResponse({
              tracks: {
                items: [
                  {
                    name: "Song",
                    artists: [
                      {
                        id: "a1",
                        name: "Artist1",
                        external_urls: { spotify: "https://open.spotify.com/artist/a1" },
                      },
                    ],
                    album: {
                      name: "Album1",
                      images: [{ url: "http://cover.jpg" }],
                      release_date: "2020-01-01",
                      total_tracks: 10,
                      external_urls: { spotify: "https://open.spotify.com/album/a1" },
                    },
                    preview_url: null,
                    external_urls: { spotify: "https://open.spotify.com/track/t1" },
                    track_number: 1,
                    duration_ms: 180000,
                  },
                ],
              },
              albums: { items: [] },
            }),
          );
        }
        // artist search group
        return Promise.resolve(jsonResponse({ artists: { items: [] } }));
      });
      vi.stubGlobal("fetch", fetchMock);

      const client = new SpotifySearchClient(
        authService,
        settingsService,
        requestCache,
        circuitBreaker,
        rateLimiter,
      );
      const result = await client.searchCatalog("Song");

      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0].name).toBe("Song");
      expect(result.tracks[0].artist).toBe("Artist1");
    });

    it("throws AppError on non-ok response (500)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

      const client = new SpotifySearchClient(
        authService,
        settingsService,
        requestCache,
        circuitBreaker,
        rateLimiter,
      );
      await expect(client.searchCatalog("test")).rejects.toBeInstanceOf(AppError);
    });

    it("includes market param when includeMarket is true (default)", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          tracks: { items: [] },
          albums: { items: [] },
          artists: { items: [] },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const client = new SpotifySearchClient(
        authService,
        settingsService,
        requestCache,
        circuitBreaker,
        rateLimiter,
      );
      await client.searchCatalog("test", ["track"], {}, { includeMarket: true });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("market=US");
    });

    it("omits market param when includeMarket is false", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          tracks: { items: [] },
          albums: { items: [] },
          artists: { items: [] },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const client = new SpotifySearchClient(
        authService,
        settingsService,
        requestCache,
        circuitBreaker,
        rateLimiter,
      );
      await client.searchCatalog("test", ["track"], {}, { includeMarket: false });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain("market=");
    });

    it("throws AppError(429) on 429 response from search", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(new Response("", { status: 429, headers: { "Retry-After": "1" } })),
      );

      const client = new SpotifySearchClient(
        authService,
        settingsService,
        requestCache,
        circuitBreaker,
        rateLimiter,
      );
      await expect(client.searchCatalog("test")).rejects.toMatchObject({
        statusCode: 429,
        errorCode: "spotify_rate_limited",
      });
    });

    it("maps albums in search results", async () => {
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.includes("type=album")) {
          return Promise.resolve(
            jsonResponse({
              albums: {
                items: [
                  {
                    id: "alb1",
                    name: "Great Album",
                    album_type: "album",
                    release_date: "2022-01-01",
                    total_tracks: 10,
                    images: [{ url: "http://album.jpg" }],
                    external_urls: { spotify: "https://open.spotify.com/album/alb1" },
                    artists: [{ id: "a1", name: "The Band" }],
                  },
                ],
              },
            }),
          );
        }
        // artist group
        return Promise.resolve(jsonResponse({ artists: { items: [] } }));
      });
      vi.stubGlobal("fetch", fetchMock);

      const client = new SpotifySearchClient(
        authService,
        settingsService,
        requestCache,
        circuitBreaker,
        rateLimiter,
      );
      const result = await client.searchCatalog("band", ["album"]);
      expect(result.albums).toHaveLength(1);
      expect(result.albums[0]?.albumName).toBe("Great Album");
    });

    it("maps artists in search results", async () => {
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.includes("type=artist")) {
          return Promise.resolve(
            jsonResponse({
              artists: {
                items: [
                  {
                    id: "ar1",
                    name: "Solo Artist",
                    images: [{ url: "http://artist.jpg" }],
                    external_urls: { spotify: "https://open.spotify.com/artist/ar1" },
                  },
                ],
              },
            }),
          );
        }
        return Promise.resolve(jsonResponse({ tracks: { items: [] }, albums: { items: [] } }));
      });
      vi.stubGlobal("fetch", fetchMock);

      const client = new SpotifySearchClient(
        authService,
        settingsService,
        requestCache,
        circuitBreaker,
        rateLimiter,
      );
      const result = await client.searchCatalog("solo", ["artist"]);
      expect(result.artists).toHaveLength(1);
      expect(result.artists[0]?.name).toBe("Solo Artist");
    });

    it("getArtistImagesBatch returns null for artists without id", async () => {
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/v1/artists?ids=")) {
          // Return artist without id field
          return Promise.resolve(
            jsonResponse({
              artists: [{ images: [{ url: "http://img.jpg" }] }],
            }),
          );
        }
        if (url.includes("type=track")) {
          return Promise.resolve(
            jsonResponse({
              tracks: {
                items: [
                  {
                    name: "Track",
                    artists: [
                      {
                        id: "a1",
                        name: "Artist",
                        external_urls: { spotify: "https://open.spotify.com/artist/a1" },
                      },
                    ],
                    album: {
                      name: "Album",
                      images: [],
                      release_date: "2020",
                      total_tracks: 1,
                      external_urls: { spotify: "https://open.spotify.com/album/x" },
                    },
                    preview_url: null,
                    external_urls: { spotify: "https://open.spotify.com/track/t1" },
                    track_number: 1,
                    duration_ms: 180000,
                  },
                ],
              },
              albums: { items: [] },
            }),
          );
        }
        return Promise.resolve(jsonResponse({ artists: { items: [] } }));
      });
      vi.stubGlobal("fetch", fetchMock);

      const client = new SpotifySearchClient(
        authService,
        settingsService,
        requestCache,
        circuitBreaker,
        rateLimiter,
      );
      // Should not throw — null image path
      const result = await client.searchCatalog("Track", ["track"]);
      expect(result.tracks).toHaveLength(1);
    });

    it("getArtistImagesBatch falls back gracefully when artist batch request fails", async () => {
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/v1/artists?ids=")) {
          return Promise.resolve(new Response("", { status: 500 }));
        }
        if (url.includes("type=track")) {
          return Promise.resolve(
            jsonResponse({
              tracks: {
                items: [
                  {
                    name: "Track",
                    artists: [
                      {
                        id: "a1",
                        name: "Artist",
                        external_urls: { spotify: "https://open.spotify.com/artist/a1" },
                      },
                    ],
                    album: {
                      name: "Album",
                      images: [],
                      release_date: "2020",
                      total_tracks: 1,
                      external_urls: { spotify: "https://open.spotify.com/album/x" },
                    },
                    preview_url: null,
                    external_urls: { spotify: "https://open.spotify.com/track/t1" },
                    track_number: 1,
                    duration_ms: 180000,
                  },
                ],
              },
              albums: { items: [] },
            }),
          );
        }
        return Promise.resolve(jsonResponse({ artists: { items: [] } }));
      });
      vi.stubGlobal("fetch", fetchMock);

      const client = new SpotifySearchClient(
        authService,
        settingsService,
        requestCache,
        circuitBreaker,
        rateLimiter,
      );
      const result = await client.searchCatalog("Track", ["track"]);
      // Should still return tracks, just with null images
      expect(result.tracks).toHaveLength(1);
    });

    it("handles empty artist IDs array (no artist batch call)", async () => {
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.includes("type=track")) {
          return Promise.resolve(
            jsonResponse({
              tracks: {
                items: [
                  {
                    // no artists field
                    name: "No Artist Track",
                    artists: [],
                    album: {
                      name: "Album",
                      images: [],
                      release_date: "2020",
                      total_tracks: 1,
                      external_urls: { spotify: "https://open.spotify.com/album/x" },
                    },
                    preview_url: null,
                    external_urls: { spotify: "https://open.spotify.com/track/t1" },
                    track_number: 1,
                    duration_ms: 180000,
                  },
                ],
              },
              albums: { items: [] },
            }),
          );
        }
        return Promise.resolve(jsonResponse({ artists: { items: [] } }));
      });
      vi.stubGlobal("fetch", fetchMock);

      const client = new SpotifySearchClient(
        authService,
        settingsService,
        requestCache,
        circuitBreaker,
        rateLimiter,
      );
      const result = await client.searchCatalog("Track", ["track"]);
      expect(result.tracks).toHaveLength(1);
      // No /v1/artists?ids= call should have been made
      const artistBatchCall = fetchMock.mock.calls.find(([url]: [string]) =>
        url.includes("/v1/artists?ids="),
      );
      expect(artistBatchCall).toBeUndefined();
    });
  });
});
