import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SettingsPort } from "@/application/ports/settings.port";
import { validateEnvironment } from "@/infrastructure/setup/environment";
import { CircuitBreaker } from "./circuit-breaker";
import { RateLimiter } from "./rate-limiter";
import { SpotifyArtistCatalogService } from "./spotify-artist-catalog.service";
import type { SpotifyAuthService } from "./spotify-auth.service";

const loggerMock = vi.hoisted(() => {
  const mock = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  };
  mock.child.mockReturnValue(mock);
  return mock;
});
vi.mock("@/infrastructure/logging/logger", () => ({ logger: loggerMock }));

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

const buildService = (market = "ES") =>
  new SpotifyArtistCatalogService(
    {
      getNumber: vi.fn().mockResolvedValue(30),
      getString: vi.fn().mockResolvedValue(market),
    } as unknown as SettingsPort,
    {
      getAppToken: vi.fn().mockResolvedValue("app-token"),
      getUserToken: vi.fn().mockResolvedValue("user-token"),
      refreshUserToken: vi.fn().mockResolvedValue(false),
    } as unknown as SpotifyAuthService,
    new CircuitBreaker(),
    new RateLimiter({ maxConcurrency: 2, minIntervalMs: 500, queueTimeoutMs: 120_000 }),
  );

beforeEach(() => {
  buildService().clearCache();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("SpotifyArtistCatalogService", () => {
  it("maps artist album catalog data", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = input.toString();
      if (!url.includes("https://api.spotify.com/v1/artists/artist-1/albums")) {
        throw new Error(`Unexpected Spotify URL: ${url}`);
      }

      return jsonResponse({
        items: [
          {
            id: "album-1",
            name: "Album 1",
            album_type: "album",
            release_date: "2026-01-01",
            images: [{ url: "https://img/album-1" }],
            external_urls: { spotify: "https://open.spotify.com/album/album-1" },
            total_tracks: 9,
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const releases = await buildService().getArtistCatalogData([
      { id: "artist-1", name: "Artist 1", imageUrl: "https://img/artist-1" },
    ]);

    expect(releases).toHaveLength(1);
    expect(releases[0]?.artistId).toBe("artist-1");
    expect(releases[0]?.albumId).toBe("album-1");
  });

  it("uses cache for repeated inputs", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ items: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const service = buildService();
    const artists = [{ id: "artist-1", name: "Artist 1", imageUrl: null }];
    await service.getArtistCatalogData(artists);
    await service.getArtistCatalogData(artists);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("SpotifyArtistCatalogService — error handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("throws AppError(429) on rate-limit response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 429, headers: { "Retry-After": "60" } })),
    );

    await expect(
      buildService().getArtistCatalogData([{ id: "artist-1", name: "A1" }]),
    ).rejects.toMatchObject({ statusCode: 429, errorCode: "spotify_rate_limited" });
  });

  it("warns and breaks out of loop on non-429 non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Server Error", { status: 500 })),
    );
    loggerMock.warn.mockClear();

    const result = await buildService().getArtistCatalogData([{ id: "artist-1", name: "A1" }]);
    expect(result).toHaveLength(0);
    expect(loggerMock.warn).toHaveBeenCalled();
  });

  it("paginates and accumulates albums from multiple pages", async () => {
    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          // Return a full page (50 items = SPOTIFY_ARTIST_ALBUMS_MAX_LIMIT)
          const items = Array.from({ length: 50 }, (_, i) => ({
            id: `album-${i}`,
            name: `Album ${i}`,
            album_type: "album",
            release_date: "2024-01-01",
            images: [{ url: "https://img/album" }],
            external_urls: { spotify: `https://open.spotify.com/album/album-${i}` },
            total_tracks: 10,
          }));
          return new Response(JSON.stringify({ items }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        // Second page: empty, ends loop
        return new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );

    const result = await buildService().getArtistCatalogData([{ id: "artist-1", name: "A1" }]);
    expect(result).toHaveLength(50);
    expect(callCount).toBe(2);
  });

  it("stops early when earlyStopBeforeDate is reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              items: [
                {
                  id: "old-album",
                  name: "Old Album",
                  album_type: "album",
                  release_date: "2020-01-01",
                  images: [],
                  external_urls: { spotify: "https://open.spotify.com/album/old" },
                  total_tracks: 5,
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );

    const earlyStop = new Date("2023-01-01");
    const result = await buildService().getArtistCatalogData(
      [{ id: "artist-1", name: "A1" }],
      earlyStop,
    );
    // Should include the album but stop early after this page
    expect(result).toHaveLength(1);
  });

  it("handles multiple artists sequentially", async () => {
    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        callCount++;
        const url = input.toString();
        const albumId = url.includes("artist-1") ? "album-a1" : "album-a2";
        return new Response(
          JSON.stringify({
            items: [
              {
                id: albumId,
                name: `Album for ${albumId}`,
                album_type: "album",
                release_date: "2024-01-01",
                images: [],
                external_urls: { spotify: `https://open.spotify.com/album/${albumId}` },
                total_tracks: 1,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );

    const result = await buildService().getArtistCatalogData([
      { id: "artist-1", name: "Artist 1" },
      { id: "artist-2", name: "Artist 2" },
    ]);
    expect(result).toHaveLength(2);
    expect(callCount).toBe(2);
  });

  it("maps null imageUrl to null on the result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              items: [
                {
                  id: "album-1",
                  name: "Album 1",
                  album_type: "album",
                  release_date: "2024-01-01",
                  images: [],
                  external_urls: { spotify: "https://open.spotify.com/album/album-1" },
                  total_tracks: 1,
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );

    const result = await buildService().getArtistCatalogData([
      { id: "artist-1", name: "A1", imageUrl: null },
    ]);
    expect(result[0]?.artistImageUrl).toBeNull();
  });

  it("falls back to 'ES' market when getMarket throws", async () => {
    const capturedUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        capturedUrls.push(input.toString());
        return new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );

    const serviceWithBadMarket = new (
      await import("./spotify-artist-catalog.service")
    ).SpotifyArtistCatalogService(
      {
        getNumber: vi.fn().mockResolvedValue(30),
        getString: vi.fn().mockRejectedValue(new Error("no market")),
      } as never,
      {
        getAppToken: vi.fn().mockResolvedValue("app-token"),
      } as never,
      new (await import("./circuit-breaker")).CircuitBreaker(),
      new (await import("./rate-limiter")).RateLimiter({
        maxConcurrency: 2,
        minIntervalMs: 0,
        queueTimeoutMs: 5000,
      }),
    );

    await serviceWithBadMarket.getArtistCatalogData([{ id: "artist-1", name: "A1" }]);
    expect(capturedUrls[0]).toContain("market=ES");
  });

  it("clearCache removes stale entries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ items: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );

    const service = buildService();
    const artists = [{ id: "artist-1", name: "A1" }];

    await service.getArtistCatalogData(artists);
    service.clearCache();
    await service.getArtistCatalogData(artists);

    expect(vi.mocked(global.fetch as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(2);
  });
});

describe("SpotifyArtistCatalogService — SettingsPort seam", () => {
  it("is constructable with a FakeSettingsPort and no SettingsService import required", () => {
    const fakeSettings = {
      getString: async () => "ES",
      getNumber: async () => 30,
      getBoolean: async () => false,
    };
    const fakeAuth = {
      getAppToken: vi.fn().mockResolvedValue("token"),
      getUserToken: vi.fn(),
      refreshUserToken: vi.fn(),
    };

    expect(
      () =>
        new SpotifyArtistCatalogService(
          fakeSettings,
          fakeAuth as unknown as SpotifyAuthService,
          new CircuitBreaker(),
          new RateLimiter({ maxConcurrency: 2, minIntervalMs: 500, queueTimeoutMs: 120_000 }),
        ),
    ).not.toThrow();
  });
});
