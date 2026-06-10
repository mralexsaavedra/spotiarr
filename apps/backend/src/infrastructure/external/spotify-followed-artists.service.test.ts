import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SettingsPort } from "@/application/ports/settings.port";
import { validateEnvironment } from "@/infrastructure/setup/environment";
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
