import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SettingsService } from "@/application/services/settings.service";
import { validateEnvironment } from "@/infrastructure/setup/environment";
import { SpotifyArtistCatalogService } from "./spotify-artist-catalog.service";
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

const buildService = (market = "ES") =>
  new SpotifyArtistCatalogService(
    {
      getNumber: vi.fn().mockResolvedValue(30),
      getString: vi.fn().mockResolvedValue(market),
    } as unknown as SettingsService,
    {
      getAppToken: vi.fn().mockResolvedValue("app-token"),
      getUserToken: vi.fn().mockResolvedValue("user-token"),
      refreshUserToken: vi.fn().mockResolvedValue(false),
    } as unknown as SpotifyAuthService,
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
