import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SettingsService } from "@/application/services/settings.service";
import { validateEnvironment } from "@/infrastructure/setup/environment";
import type { SpotifyAuthService } from "./spotify-auth.service";
import {
  isOwnedPlaylist,
  needsPlaylistItemsAccessCheck,
  SpotifyPlaylistLibraryService,
  type SpotifyUserPlaylistItem,
} from "./spotify-playlist-library.service";

const buildPlaylist = (
  overrides: Partial<SpotifyUserPlaylistItem> = {},
): SpotifyUserPlaylistItem => ({
  id: "playlist-id",
  name: "Playlist",
  collaborative: false,
  images: [],
  owner: {
    id: "other-user",
    display_name: "Other User",
    external_urls: { spotify: "https://open.spotify.com/user/other-user" },
  },
  tracks: { total: 10 },
  external_urls: { spotify: "https://open.spotify.com/playlist/playlist-id" },
  ...overrides,
});

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
  new SpotifyPlaylistLibraryService(
    {
      getNumber: vi.fn().mockResolvedValue(30),
    } as unknown as SettingsService,
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

describe("isOwnedPlaylist", () => {
  it("detects playlists owned by the current user", () => {
    const playlist = buildPlaylist({ owner: { ...buildPlaylist().owner, id: "current-user" } });

    expect(isOwnedPlaylist(playlist, "current-user")).toBe(true);
  });

  it("does not treat non-owned collaborative playlists as owned", () => {
    const playlist = buildPlaylist({ collaborative: true });

    expect(isOwnedPlaylist(playlist, "current-user")).toBe(false);
  });
});

describe("needsPlaylistItemsAccessCheck", () => {
  it("skips the access probe for owned playlists", () => {
    const playlist = buildPlaylist({ owner: { ...buildPlaylist().owner, id: "current-user" } });

    expect(needsPlaylistItemsAccessCheck(playlist, "current-user")).toBe(false);
  });

  it("probes non-owned playlists instead of trusting the collaborative flag", () => {
    const playlist = buildPlaylist({ collaborative: true });

    expect(needsPlaylistItemsAccessCheck(playlist, "current-user")).toBe(true);
  });
});

describe("SpotifyPlaylistLibraryService.getMyPlaylists", () => {
  it("keeps owned playlists, probes non-owned playlists, and filters inaccessible ones", async () => {
    const ownedPlaylist = buildPlaylist({
      id: "owned",
      name: "Owned",
      owner: { ...buildPlaylist().owner, id: "current-user", display_name: "Me" },
      external_urls: { spotify: "https://open.spotify.com/playlist/owned" },
    });
    const accessiblePlaylist = buildPlaylist({
      id: "accessible",
      name: "Accessible",
      external_urls: { spotify: "https://open.spotify.com/playlist/accessible" },
    });
    const inaccessiblePlaylist = buildPlaylist({
      id: "inaccessible",
      name: "Inaccessible",
      external_urls: { spotify: "https://open.spotify.com/playlist/inaccessible" },
    });

    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = input.toString();

      if (url === "https://api.spotify.com/v1/me") {
        return jsonResponse({ id: "current-user" });
      }

      if (url === "https://api.spotify.com/v1/me/playlists?limit=50") {
        return jsonResponse({
          items: [ownedPlaylist, accessiblePlaylist, inaccessiblePlaylist],
          next: null,
        });
      }

      if (url.includes("/playlists/accessible/items")) {
        return jsonResponse({ total: 1 });
      }

      if (url.includes("/playlists/inaccessible/items")) {
        return jsonResponse({ error: { status: 403 } }, 403);
      }

      throw new Error(`Unexpected Spotify URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const playlists = await buildService().getMyPlaylists();

    expect(playlists.map((playlist) => playlist.id)).toEqual(["owned", "accessible"]);
  });
});
