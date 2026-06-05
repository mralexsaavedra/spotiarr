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
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/playlists/owned/items"),
      expect.anything(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/playlists/accessible/items"),
      expect.anything(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/playlists/inaccessible/items"),
      expect.anything(),
    );
  });

  it("uses the access cache to avoid repeated non-owned playlist probes", async () => {
    const accessiblePlaylist = buildPlaylist({
      id: "accessible",
      name: "Accessible",
      external_urls: { spotify: "https://open.spotify.com/playlist/accessible" },
    });

    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = input.toString();

      if (url === "https://api.spotify.com/v1/me") {
        return jsonResponse({ id: "current-user" });
      }

      if (url === "https://api.spotify.com/v1/me/playlists?limit=50") {
        return jsonResponse({ items: [accessiblePlaylist], next: null });
      }

      if (url.includes("/playlists/accessible/items")) {
        return jsonResponse({ total: 1 });
      }

      throw new Error(`Unexpected Spotify URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const service = buildService();
    await service.getMyPlaylists();
    await service.getMyPlaylists();

    const itemProbeCalls = fetchMock.mock.calls.filter(([input]) =>
      input.toString().includes("/playlists/accessible/items"),
    );
    expect(itemProbeCalls).toHaveLength(1);
  });

  it("uses probe total when a non-owned playlist item is missing track total", async () => {
    const accessiblePlaylist = buildPlaylist({
      id: "accessible",
      name: "Accessible",
      tracks: {},
      external_urls: { spotify: "https://open.spotify.com/playlist/accessible" },
    });

    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = input.toString();

      if (url === "https://api.spotify.com/v1/me") {
        return jsonResponse({ id: "current-user" });
      }

      if (url === "https://api.spotify.com/v1/me/playlists?limit=50") {
        return jsonResponse({ items: [accessiblePlaylist], next: null });
      }

      if (url.includes("/playlists/accessible/items")) {
        return jsonResponse({ total: 42 });
      }

      throw new Error(`Unexpected Spotify URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const playlists = await buildService().getMyPlaylists();

    expect(playlists).toHaveLength(1);
    expect(playlists[0]?.tracks).toBe(42);
  });

  it("uses probe total when a non-owned playlist summary reports zero tracks", async () => {
    const accessiblePlaylist = buildPlaylist({
      id: "accessible",
      name: "Accessible",
      tracks: { total: 0 },
      external_urls: { spotify: "https://open.spotify.com/playlist/accessible" },
    });

    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = input.toString();

      if (url === "https://api.spotify.com/v1/me") {
        return jsonResponse({ id: "current-user" });
      }

      if (url === "https://api.spotify.com/v1/me/playlists?limit=50") {
        return jsonResponse({ items: [accessiblePlaylist], next: null });
      }

      if (url.includes("/playlists/accessible/items")) {
        return jsonResponse({ total: 42 });
      }

      throw new Error(`Unexpected Spotify URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const playlists = await buildService().getMyPlaylists();

    expect(playlists).toHaveLength(1);
    expect(playlists[0]?.tracks).toBe(42);
  });

  it("probes owned playlists when the /me summary incorrectly reports zero tracks", async () => {
    const ownedPlaylist = buildPlaylist({
      id: "owned-zero",
      name: "Owned Zero",
      owner: { ...buildPlaylist().owner, id: "current-user", display_name: "Me" },
      tracks: { total: 0 },
      external_urls: { spotify: "https://open.spotify.com/playlist/owned-zero" },
    });

    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = input.toString();

      if (url === "https://api.spotify.com/v1/me") {
        return jsonResponse({ id: "current-user" });
      }

      if (url === "https://api.spotify.com/v1/me/playlists?limit=50") {
        return jsonResponse({ items: [ownedPlaylist], next: null });
      }

      if (url.includes("/playlists/owned-zero/items")) {
        return jsonResponse({ total: 100 });
      }

      throw new Error(`Unexpected Spotify URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const playlists = await buildService().getMyPlaylists();

    expect(playlists).toHaveLength(1);
    expect(playlists[0]?.tracks).toBe(100);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/playlists/owned-zero/items"),
      expect.anything(),
    );
  });

  it("expires cached access probe results and re-probes deterministically", async () => {
    const accessiblePlaylist = buildPlaylist({
      id: "accessible",
      name: "Accessible",
      external_urls: { spotify: "https://open.spotify.com/playlist/accessible" },
    });

    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = input.toString();

      if (url === "https://api.spotify.com/v1/me") {
        return jsonResponse({ id: "current-user" });
      }

      if (url === "https://api.spotify.com/v1/me/playlists?limit=50") {
        return jsonResponse({ items: [accessiblePlaylist], next: null });
      }

      if (url.includes("/playlists/accessible/items")) {
        return jsonResponse({ total: 1 });
      }

      throw new Error(`Unexpected Spotify URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const service = buildService();
    await service.getMyPlaylists();

    const cache = (
      service as unknown as {
        playlistAccessCache: Map<string, { expiresAt: number }>;
      }
    ).playlistAccessCache;
    const entry = cache.get("accessible");
    expect(entry).toBeDefined();
    entry!.expiresAt = Date.now() - 1;

    await service.getMyPlaylists();

    const itemProbeCalls = fetchMock.mock.calls.filter(([input]) =>
      input.toString().includes("/playlists/accessible/items"),
    );
    expect(itemProbeCalls).toHaveLength(2);
  });

  it("degrades to owned and cached accessible playlists during Spotify probe 429 cooldown", async () => {
    const ownedPlaylist = buildPlaylist({
      id: "owned",
      name: "Owned",
      owner: { ...buildPlaylist().owner, id: "current-user", display_name: "Me" },
      external_urls: { spotify: "https://open.spotify.com/playlist/owned" },
    });
    const cachedAccessiblePlaylist = buildPlaylist({
      id: "cached-accessible",
      name: "Cached Accessible",
      external_urls: { spotify: "https://open.spotify.com/playlist/cached-accessible" },
    });
    const rateLimitedPlaylist = buildPlaylist({
      id: "rate-limited",
      name: "Rate Limited",
      external_urls: { spotify: "https://open.spotify.com/playlist/rate-limited" },
    });
    const unknownPlaylist = buildPlaylist({
      id: "unknown",
      name: "Unknown",
      external_urls: { spotify: "https://open.spotify.com/playlist/unknown" },
    });

    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = input.toString();

      if (url === "https://api.spotify.com/v1/me") {
        return jsonResponse({ id: "current-user" });
      }

      if (url === "https://api.spotify.com/v1/me/playlists?limit=50") {
        return jsonResponse({
          items: [ownedPlaylist, cachedAccessiblePlaylist, rateLimitedPlaylist, unknownPlaylist],
          next: null,
        });
      }

      if (url.includes("/playlists/cached-accessible/items")) {
        return jsonResponse({ total: 1 });
      }

      if (url.includes("/playlists/rate-limited/items")) {
        return new Response(JSON.stringify({ error: { status: 429 } }), {
          status: 429,
          headers: { "Retry-After": "120" },
        });
      }

      if (url.includes("/playlists/unknown/items")) {
        throw new Error("Unknown playlist should not be probed during cooldown");
      }

      throw new Error(`Unexpected Spotify URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const service = buildService();
    const playlists = await service.getMyPlaylists();
    const playlistsDuringCooldown = await service.getMyPlaylists();

    expect(playlists.map((playlist) => playlist.id)).toEqual(["owned", "cached-accessible"]);
    expect(playlistsDuringCooldown.map((playlist) => playlist.id)).toEqual([
      "owned",
      "cached-accessible",
    ]);

    const rateLimitedProbeCalls = fetchMock.mock.calls.filter(([input]) =>
      input.toString().includes("/playlists/rate-limited/items"),
    );
    expect(rateLimitedProbeCalls).toHaveLength(1);
  });
});
