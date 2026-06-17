import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SettingsPort } from "@/application/ports/settings.port";
import { validateEnvironment } from "@/infrastructure/setup/environment";
import { CircuitBreaker } from "./circuit-breaker";
import { RateLimiter } from "./rate-limiter";
import type { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyFollowedArtistsService } from "./spotify-followed-artists.service";

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

const buildService = () =>
  new SpotifyFollowedArtistsService(
    {
      getNumber: vi
        .fn()
        .mockImplementation((key: string) =>
          Promise.resolve(key === "FOLLOWED_ARTISTS_MAX" ? 10 : 30),
        ),
    } as unknown as SettingsPort,
    {
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

describe("SpotifyFollowedArtistsService", () => {
  it("sorts and maps followed artists", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = input.toString();
      if (!url.includes("https://api.spotify.com/v1/me/following")) {
        throw new Error(`Unexpected Spotify URL: ${url}`);
      }

      return jsonResponse({
        artists: {
          items: [
            {
              id: "2",
              name: "Zulu",
              images: [{ url: "https://img/zulu" }],
              external_urls: { spotify: "https://open.spotify.com/artist/2" },
            },
            {
              id: "1",
              name: "Alpha",
              images: [{ url: "https://img/alpha" }],
              external_urls: { spotify: "https://open.spotify.com/artist/1" },
            },
          ],
          cursors: {},
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const artists = await buildService().getFollowedArtists();

    expect(artists.map((artist) => artist.id)).toEqual(["1", "2"]);
    expect(artists[0]?.spotifyUrl).toBe("https://open.spotify.com/artist/1");
  });

  it("throws AppError(401) on 401 from /me/following", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Unauthorized", { status: 401 })),
    );

    await expect(buildService().getFollowedArtists()).rejects.toMatchObject({
      statusCode: 401,
      errorCode: "missing_user_access_token",
    });
  });

  it("throws AppError(429) on 429 from /me/following", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Too Many Requests", { status: 429 })),
    );

    await expect(buildService().getFollowedArtists()).rejects.toMatchObject({
      statusCode: 429,
      errorCode: "spotify_rate_limited",
    });
  });

  it("throws AppError on other non-ok status from /me/following", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Server Error", { status: 500 })),
    );

    await expect(buildService().getFollowedArtists()).rejects.toMatchObject({
      statusCode: 500,
      errorCode: "failed_to_fetch_followed_artists",
    });
  });

  it("paginates through multiple pages using cursor", async () => {
    let page = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = input.toString();
        page++;
        if (page === 1 && !url.includes("after=")) {
          return new Response(
            JSON.stringify({
              artists: {
                items: [
                  {
                    id: "1",
                    name: "Alpha",
                    images: [],
                    external_urls: { spotify: "https://open.spotify.com/artist/1" },
                  },
                ],
                cursors: { after: "cursor-abc" },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        // Second page with no more cursor
        return new Response(
          JSON.stringify({
            artists: {
              items: [
                {
                  id: "2",
                  name: "Beta",
                  images: [],
                  external_urls: { spotify: "https://open.spotify.com/artist/2" },
                },
              ],
              cursors: {},
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );

    const artists = await buildService().getFollowedArtists();
    // maxArtists is 10 from buildService, so we get both
    expect(artists.length).toBe(2);
  });

  it("stops paginating when maxArtists is reached", async () => {
    // Build service with maxArtists=1
    const service = new (
      await import("./spotify-followed-artists.service")
    ).SpotifyFollowedArtistsService(
      {
        getNumber: vi
          .fn()
          .mockImplementation((key: string) =>
            Promise.resolve(key === "FOLLOWED_ARTISTS_MAX" ? 1 : 30),
          ),
      } as never,
      {
        getUserToken: vi.fn().mockResolvedValue("user-token"),
        refreshUserToken: vi.fn().mockResolvedValue(false),
      } as never,
      new (await import("./circuit-breaker")).CircuitBreaker(),
      new (await import("./rate-limiter")).RateLimiter({
        maxConcurrency: 2,
        minIntervalMs: 0,
        queueTimeoutMs: 120_000,
      }),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              artists: {
                items: [
                  {
                    id: "1",
                    name: "Only One",
                    images: [{ url: "https://img/1" }],
                    external_urls: { spotify: "https://open.spotify.com/artist/1" },
                  },
                  {
                    id: "2",
                    name: "Should Not Appear",
                    images: [],
                    external_urls: { spotify: "https://open.spotify.com/artist/2" },
                  },
                ],
                cursors: { after: "cursor-abc" },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );

    const artists = await service.getFollowedArtists();
    // Should be sliced to 1
    expect(artists.length).toBe(1);
    expect(artists[0]?.id).toBe("1");
  });

  it("maps null imageUrl to null and missing spotifyUrl to null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              artists: {
                items: [
                  {
                    id: "1",
                    name: "No Image",
                    images: [],
                    external_urls: {},
                  },
                ],
                cursors: {},
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );

    const artists = await buildService().getFollowedArtists();
    expect(artists[0]?.image).toBeNull();
    expect(artists[0]?.spotifyUrl).toBeNull();
  });

  it("uses cache for repeated calls", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        artists: {
          items: [
            {
              id: "1",
              name: "Alpha",
              images: [{ url: "https://img/alpha" }],
              external_urls: { spotify: "https://open.spotify.com/artist/1" },
            },
          ],
          cursors: {},
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const service = buildService();
    await service.getFollowedArtists();
    await service.getFollowedArtists();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
