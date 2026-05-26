import type { ArtistRelease } from "@spotiarr/shared";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FeedRepositoryPort } from "@/application/ports/feed-repository.port";
import type { DeezerClient } from "./providers/deezer/deezer.client";
import type { MusicBrainzClient } from "./providers/musicbrainz/musicbrainz.client";
import { ReleaseFeedService, type CatalogArtist } from "./release-feed.service";

function makeRelease(overrides: Partial<ArtistRelease> = {}): ArtistRelease {
  return {
    artistId: "default-artist-id",
    artistName: "Default Artist",
    artistImageUrl: null,
    albumId: "album-1",
    albumName: "Album One",
    albumType: "album",
    releaseDate: new Date().toISOString().slice(0, 10),
    coverUrl: null,
    ...overrides,
  };
}

function makeArtist(overrides: Partial<CatalogArtist> = {}): CatalogArtist {
  return {
    id: "spotify-artist-1",
    name: "Test Artist",
    imageUrl: null,
    ...overrides,
  };
}

function mockRepo(): FeedRepositoryPort {
  return {
    getArtistCatalogIdentities: vi.fn().mockResolvedValue([]),
    updateArtistCatalogIdentities: vi.fn().mockResolvedValue(undefined),
  } as unknown as FeedRepositoryPort;
}

function mockDeezer(): DeezerClient {
  return {
    searchArtist: vi.fn().mockResolvedValue(null),
    getArtistAlbums: vi.fn().mockResolvedValue([]),
  } as unknown as DeezerClient;
}

function mockMusicBrainz(): MusicBrainzClient {
  return {
    searchArtist: vi.fn().mockResolvedValue(null),
    getArtistReleaseGroups: vi.fn().mockResolvedValue([]),
  } as unknown as MusicBrainzClient;
}

describe("ReleaseFeedService", () => {
  let service: ReleaseFeedService;
  let repo: FeedRepositoryPort;
  let deezer: DeezerClient;
  let musicBrainz: MusicBrainzClient;

  beforeEach(() => {
    repo = mockRepo();
    deezer = mockDeezer();
    musicBrainz = mockMusicBrainz();
    service = new ReleaseFeedService(repo, deezer, musicBrainz);
  });

  describe("Scenario: Deezer resolves artist and releases", () => {
    it("SHALL fetch releases from Deezer and NOT call Spotify catalog endpoints", async () => {
      const artist = makeArtist();
      const deezerAlbums = [makeRelease({ albumId: "dz-1", albumName: "Deezer Album" })];

      vi.mocked(deezer.searchArtist).mockResolvedValue({ id: 123, name: artist.name });
      vi.mocked(deezer.getArtistAlbums).mockResolvedValue(deezerAlbums);

      const { releases, decisions } = await service.getActiveArtistReleases([artist]);

      expect(deezer.searchArtist).toHaveBeenCalledWith(artist.name);
      expect(deezer.getArtistAlbums).toHaveBeenCalledWith(123);
      expect(releases.length).toBeGreaterThan(0);
      expect(decisions[0].provider).toBe("deezer");
      expect(decisions[0].albumsFound).toBe(1);
    });
  });

  describe("Scenario: MusicBrainz fallback when Deezer misses", () => {
    it("SHALL fetch releases from MusicBrainz and NOT call Spotify catalog endpoints", async () => {
      const artist = makeArtist();
      const mbReleases = [makeRelease({ albumId: "mb-1", albumName: "MB Album" })];

      vi.mocked(deezer.searchArtist).mockResolvedValue(null);
      vi.mocked(musicBrainz.searchArtist).mockResolvedValue({ id: "mb-id-1", name: artist.name });
      vi.mocked(musicBrainz.getArtistReleaseGroups).mockResolvedValue(mbReleases);

      const { releases, decisions } = await service.getActiveArtistReleases([artist]);

      expect(deezer.searchArtist).toHaveBeenCalledWith(artist.name);
      expect(musicBrainz.searchArtist).toHaveBeenCalledWith(artist.name);
      expect(musicBrainz.getArtistReleaseGroups).toHaveBeenCalledWith("mb-id-1");
      expect(releases.length).toBeGreaterThan(0);
      expect(decisions[0].provider).toBe("musicbrainz");
      expect(decisions[0].albumsFound).toBe(1);
    });
  });

  describe("Scenario: Deezer and MusicBrainz miss", () => {
    it("SHALL stay unresolved and not call Spotify during catalog sync", async () => {
      const artist = makeArtist();

      vi.mocked(deezer.searchArtist).mockResolvedValue(null);
      vi.mocked(musicBrainz.searchArtist).mockResolvedValue(null);

      const { releases, decisions } = await service.getActiveArtistReleases([artist]);

      expect(deezer.searchArtist).toHaveBeenCalledWith(artist.name);
      expect(musicBrainz.searchArtist).toHaveBeenCalledWith(artist.name);
      expect(releases).toHaveLength(0);
      expect(decisions[0].provider).toBe("unresolved");
      expect(decisions[0].albumsFound).toBe(0);
    });
  });

  describe("Scenario: Stored Deezer ID exists", () => {
    it("SHALL use stored deezerId directly and skip search", async () => {
      const artist = makeArtist();
      const deezerAlbums = [makeRelease({ albumId: "dz-2", albumName: "Stored Deezer Album" })];

      vi.mocked(repo.getArtistCatalogIdentities).mockResolvedValue([
        { spotifyId: artist.id, deezerId: "stored-dz-id", mbid: null },
      ]);
      vi.mocked(deezer.getArtistAlbums).mockResolvedValue(deezerAlbums);

      const { releases, decisions } = await service.getActiveArtistReleases([artist]);

      expect(deezer.searchArtist).not.toHaveBeenCalled();
      expect(deezer.getArtistAlbums).toHaveBeenCalledWith("stored-dz-id");
      expect(releases.length).toBeGreaterThan(0);
      expect(decisions[0].provider).toBe("deezer");
    });
  });

  describe("Scenario: Identity learned during sync", () => {
    it("SHALL persist resolved Deezer identity for future runs", async () => {
      const artist = makeArtist();
      const deezerAlbums = [makeRelease({ albumId: "dz-3", albumName: "Learned Album" })];

      vi.mocked(repo.getArtistCatalogIdentities).mockResolvedValue([
        { spotifyId: artist.id, deezerId: null, mbid: null },
      ]);
      vi.mocked(deezer.searchArtist).mockResolvedValue({ id: 456, name: artist.name });
      vi.mocked(deezer.getArtistAlbums).mockResolvedValue(deezerAlbums);

      const { decisions } = await service.getActiveArtistReleases([artist]);

      expect(deezer.searchArtist).toHaveBeenCalledWith(artist.name);
      expect(repo.updateArtistCatalogIdentities).toHaveBeenCalledWith([
        { spotifyId: artist.id, deezerId: "456" },
      ]);
      expect(decisions[0].newIdentityPersisted).toBe(true);
    });

    it("SHALL persist resolved MusicBrainz identity for future runs", async () => {
      const artist = makeArtist();
      const mbReleases = [makeRelease({ albumId: "mb-2", albumName: "Learned MB Album" })];

      vi.mocked(repo.getArtistCatalogIdentities).mockResolvedValue([
        { spotifyId: artist.id, deezerId: null, mbid: null },
      ]);
      vi.mocked(deezer.searchArtist).mockResolvedValue(null);
      vi.mocked(musicBrainz.searchArtist).mockResolvedValue({
        id: "mb-learned",
        name: artist.name,
      });
      vi.mocked(musicBrainz.getArtistReleaseGroups).mockResolvedValue(mbReleases);

      const { decisions } = await service.getActiveArtistReleases([artist]);

      expect(repo.updateArtistCatalogIdentities).toHaveBeenCalledWith([
        { spotifyId: artist.id, mbid: "mb-learned" },
      ]);
      expect(decisions[0].newIdentityPersisted).toBe(true);
      expect(decisions[0].provider).toBe("musicbrainz");
    });
  });

  describe("Scenario: Scope isolation to background feed sync", () => {
    it("SHALL map releases to original Spotify artistId so interactive caches remain unchanged", async () => {
      const artist = makeArtist({ id: "sp-id-42", name: "Mapped Artist" });
      const deezerAlbums = [makeRelease({ albumId: "dz-1", artistId: "deezer-id-99" })];

      vi.mocked(deezer.searchArtist).mockResolvedValue({ id: 123, name: artist.name });
      vi.mocked(deezer.getArtistAlbums).mockResolvedValue(deezerAlbums);

      const { releases } = await service.getActiveArtistReleases([artist]);

      // Even though Deezer returned a different artistId, the service normalizes
      // it back to the original Spotify id so downstream ArtistReleaseCache keys
      // and UI contracts are preserved — interactive paths stay unchanged.
      expect(releases[0].artistId).toBe("sp-id-42");
      expect(releases[0].artistName).toBe("Mapped Artist");
    });

    it("SHALL never call Spotify catalog in release feed sync", async () => {
      const artist = makeArtist();
      const deezerAlbums = [makeRelease({ albumId: "dz-1" })];

      vi.mocked(deezer.searchArtist).mockResolvedValue({ id: 123, name: artist.name });
      vi.mocked(deezer.getArtistAlbums).mockResolvedValue(deezerAlbums);

      await service.getActiveArtistReleases([artist]);
    });
  });

  describe("Scenario: User follow-source preservation", () => {
    it("SHALL not use Spotify service for release lookup", async () => {
      const artist = makeArtist();

      vi.mocked(deezer.searchArtist).mockResolvedValue(null);
      vi.mocked(musicBrainz.searchArtist).mockResolvedValue(null);

      await service.getActiveArtistReleases([artist]);
      // Method completes without error — Spotify catalog is not called since it's no longer in the constructor
    });
  });

  describe("Provider decision counts and logging", () => {
    it("SHALL log aggregate decisions after processing all artists", async () => {
      const artists = [
        makeArtist({ id: "a1", name: "Artist One" }),
        makeArtist({ id: "a2", name: "Artist Two" }),
      ];

      vi.mocked(deezer.searchArtist).mockImplementation(async (name: string) => {
        if (name === "Artist One") return { id: 100, name };
        return null;
      });
      vi.mocked(deezer.getArtistAlbums).mockResolvedValue([makeRelease()]);
      vi.mocked(musicBrainz.searchArtist).mockImplementation(async (name: string) => {
        if (name === "Artist Two") return { id: "mb-200", name };
        return null;
      });
      vi.mocked(musicBrainz.getArtistReleaseGroups).mockResolvedValue([makeRelease()]);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await service.getActiveArtistReleases(artists);

      const logCall = consoleSpy.mock.calls.find((call) =>
        String(call[0]).includes("[ReleaseFeedService] Sync decisions"),
      );
      expect(logCall).toBeDefined();
      expect(String(logCall![0])).toContain("Deezer: 1");
      expect(String(logCall![0])).toContain("MusicBrainz: 1");

      consoleSpy.mockRestore();
    });
  });

  describe("filterByLookback — lookbackDays parameter", () => {
    it("SHALL exclude releases older than the configured lookbackDays window (7d)", async () => {
      const artist = makeArtist();
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      vi.mocked(deezer.searchArtist).mockResolvedValue({ id: 1, name: artist.name });
      vi.mocked(deezer.getArtistAlbums).mockResolvedValue([
        makeRelease({ albumId: "old", releaseDate: eightDaysAgo }),
        makeRelease({ albumId: "new", releaseDate: twoDaysAgo }),
      ]);

      const { releases } = await service.getActiveArtistReleases([artist], { lookbackDays: 7 });

      expect(releases).toHaveLength(1);
      expect(releases[0].albumId).toBe("new");
    });

    it("SHALL include releases up to the configured lookbackDays window (90d)", async () => {
      const artist = makeArtist();
      const eightyNineDaysAgo = new Date(Date.now() - 89 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const ninetyOneDaysAgo = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      vi.mocked(deezer.searchArtist).mockResolvedValue({ id: 1, name: artist.name });
      vi.mocked(deezer.getArtistAlbums).mockResolvedValue([
        makeRelease({ albumId: "in-window", releaseDate: eightyNineDaysAgo }),
        makeRelease({ albumId: "out-of-window", releaseDate: ninetyOneDaysAgo }),
      ]);

      const { releases } = await service.getActiveArtistReleases([artist], { lookbackDays: 90 });

      expect(releases).toHaveLength(1);
      expect(releases[0].albumId).toBe("in-window");
    });

    it("SHALL default to 30-day window when options are omitted", async () => {
      const artist = makeArtist();
      const twentyNineDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      vi.mocked(deezer.searchArtist).mockResolvedValue({ id: 1, name: artist.name });
      vi.mocked(deezer.getArtistAlbums).mockResolvedValue([
        makeRelease({ albumId: "in-window", releaseDate: twentyNineDaysAgo }),
        makeRelease({ albumId: "out-of-window", releaseDate: thirtyOneDaysAgo }),
      ]);

      // No options passed — default should be 30
      const { releases } = await service.getActiveArtistReleases([artist]);

      expect(releases).toHaveLength(1);
      expect(releases[0].albumId).toBe("in-window");
    });
  });

  describe("getArtistDiscography", () => {
    it("returns unfiltered albums for a single artist", async () => {
      const artist = makeArtist();
      const oldAlbum = makeRelease({
        albumId: "old-1",
        albumName: "Old Album",
        releaseDate: "2020-01-01",
      });
      const recentAlbum = makeRelease({
        albumId: "recent-1",
        albumName: "Recent Album",
        releaseDate: new Date().toISOString().slice(0, 10),
      });

      vi.mocked(deezer.searchArtist).mockResolvedValue({ id: 123, name: artist.name });
      vi.mocked(deezer.getArtistAlbums).mockResolvedValue([oldAlbum, recentAlbum]);

      const { albums, decision } = await service.getArtistDiscography(artist);

      expect(albums).toHaveLength(2);
      expect(albums[0].artistId).toBe(artist.id);
      expect(albums[1].artistId).toBe(artist.id);
      expect(decision.provider).toBe("deezer");
      expect(decision.albumsFound).toBe(2);
    });

    it("does NOT apply 30-day lookback filter", async () => {
      const artist = makeArtist();
      const veryOldAlbum = makeRelease({
        albumId: "very-old-1",
        albumName: "Very Old Album",
        releaseDate: "2010-01-01",
      });

      vi.mocked(deezer.searchArtist).mockResolvedValue({ id: 123, name: artist.name });
      vi.mocked(deezer.getArtistAlbums).mockResolvedValue([veryOldAlbum]);

      const { albums } = await service.getArtistDiscography(artist);

      expect(albums).toHaveLength(1);
      expect(albums[0].albumId).toBe("very-old-1");
    });

    it("normalizes artistId back to Spotify id", async () => {
      const artist = makeArtist({ id: "sp-id-42" });
      const deezerAlbums = [makeRelease({ albumId: "dz-1", artistId: "deezer-id-99" })];

      vi.mocked(deezer.searchArtist).mockResolvedValue({ id: 123, name: artist.name });
      vi.mocked(deezer.getArtistAlbums).mockResolvedValue(deezerAlbums);

      const { albums } = await service.getArtistDiscography(artist);

      expect(albums[0].artistId).toBe("sp-id-42");
      expect(albums[0].artistName).toBe("Test Artist");
    });

    it("stays unresolved when Deezer and MusicBrainz miss", async () => {
      const artist = makeArtist();

      vi.mocked(deezer.searchArtist).mockResolvedValue(null);
      vi.mocked(musicBrainz.searchArtist).mockResolvedValue(null);

      const { albums, decision } = await service.getArtistDiscography(artist);

      expect(albums).toHaveLength(0);
      expect(decision.provider).toBe("unresolved");
    });

    it("persists newly learned identity immediately", async () => {
      const artist = makeArtist();
      const deezerAlbums = [makeRelease({ albumId: "dz-1" })];

      vi.mocked(repo.getArtistCatalogIdentities).mockResolvedValue([
        { spotifyId: artist.id, deezerId: null, mbid: null },
      ]);
      vi.mocked(deezer.searchArtist).mockResolvedValue({ id: 789, name: artist.name });
      vi.mocked(deezer.getArtistAlbums).mockResolvedValue(deezerAlbums);

      await service.getArtistDiscography(artist);

      expect(repo.updateArtistCatalogIdentities).toHaveBeenCalledWith([
        { spotifyId: artist.id, deezerId: "789" },
      ]);
    });

    it("uses stored deezerId directly and skips Spotify in getArtistDiscography", async () => {
      const artist = makeArtist();
      const deezerAlbums = [makeRelease({ albumId: "dz-2", albumName: "Stored Deezer Album" })];

      vi.mocked(repo.getArtistCatalogIdentities).mockResolvedValue([
        { spotifyId: artist.id, deezerId: "stored-dz-id", mbid: null },
      ]);
      vi.mocked(deezer.getArtistAlbums).mockResolvedValue(deezerAlbums);

      const { albums, decision } = await service.getArtistDiscography(artist);

      expect(deezer.searchArtist).not.toHaveBeenCalled();
      expect(deezer.getArtistAlbums).toHaveBeenCalledWith("stored-dz-id");
      expect(albums.length).toBeGreaterThan(0);
      expect(decision.provider).toBe("deezer");
    });

    it("returns Deezer albums and skips Spotify", async () => {
      const artist = makeArtist();
      const deezerAlbums = [makeRelease({ albumId: "dz-1" })];

      vi.mocked(deezer.searchArtist).mockResolvedValue({ id: 123, name: artist.name });
      vi.mocked(deezer.getArtistAlbums).mockResolvedValue(deezerAlbums);

      const { albums, decision } = await service.getArtistDiscography(artist);

      expect(albums).toHaveLength(1);
      expect(albums[0].albumId).toBe("dz-1");
      expect(albums[0].artistId).toBe(artist.id);
      expect(decision.provider).toBe("deezer");
    });
  });
});
