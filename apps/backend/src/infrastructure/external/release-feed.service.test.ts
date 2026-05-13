import type { ArtistRelease } from "@spotiarr/shared";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FeedRepository } from "@/infrastructure/database/feed.repository";
import type { DeezerClient } from "./providers/deezer/deezer.client";
import type { MusicBrainzClient } from "./providers/musicbrainz/musicbrainz.client";
import { ReleaseFeedService, type CatalogArtist } from "./release-feed.service";
import type { SpotifyUserLibraryService } from "./spotify-user-library.service";

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

function mockRepo(): FeedRepository {
  return {
    getArtistCatalogIdentities: vi.fn().mockResolvedValue([]),
    updateArtistCatalogIdentities: vi.fn().mockResolvedValue(undefined),
  } as unknown as FeedRepository;
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

function mockSpotify(): SpotifyUserLibraryService {
  return {
    getActiveArtistReleases: vi.fn().mockResolvedValue([]),
  } as unknown as SpotifyUserLibraryService;
}

describe("ReleaseFeedService", () => {
  let service: ReleaseFeedService;
  let repo: FeedRepository;
  let deezer: DeezerClient;
  let musicBrainz: MusicBrainzClient;
  let spotify: SpotifyUserLibraryService;

  beforeEach(() => {
    repo = mockRepo();
    deezer = mockDeezer();
    musicBrainz = mockMusicBrainz();
    spotify = mockSpotify();
    service = new ReleaseFeedService(repo, deezer, musicBrainz, spotify);
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
      expect(spotify.getActiveArtistReleases).not.toHaveBeenCalled();
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
      expect(spotify.getActiveArtistReleases).not.toHaveBeenCalled();
      expect(releases.length).toBeGreaterThan(0);
      expect(decisions[0].provider).toBe("musicbrainz");
      expect(decisions[0].albumsFound).toBe(1);
    });
  });

  describe("Scenario: Spotify fallback only after Deezer and MusicBrainz miss", () => {
    it("SHALL call Spotify only when both Deezer and MusicBrainz return no albums", async () => {
      const artist = makeArtist();
      const spotifyReleases = [makeRelease({ albumId: "sp-1", albumName: "Spotify Album" })];

      vi.mocked(deezer.searchArtist).mockResolvedValue(null);
      vi.mocked(musicBrainz.searchArtist).mockResolvedValue(null);
      vi.mocked(spotify.getActiveArtistReleases).mockResolvedValue(spotifyReleases);

      const { releases, decisions } = await service.getActiveArtistReleases([artist]);

      expect(deezer.searchArtist).toHaveBeenCalledWith(artist.name);
      expect(musicBrainz.searchArtist).toHaveBeenCalledWith(artist.name);
      expect(spotify.getActiveArtistReleases).toHaveBeenCalledWith([artist]);
      expect(releases.length).toBeGreaterThan(0);
      expect(decisions[0].provider).toBe("spotify");
      expect(decisions[0].albumsFound).toBe(1);
    });

    it("SHALL record unresolved when Spotify also returns no releases", async () => {
      const artist = makeArtist();

      vi.mocked(deezer.searchArtist).mockResolvedValue(null);
      vi.mocked(musicBrainz.searchArtist).mockResolvedValue(null);
      vi.mocked(spotify.getActiveArtistReleases).mockResolvedValue([]);

      const { releases, decisions } = await service.getActiveArtistReleases([artist]);

      expect(spotify.getActiveArtistReleases).toHaveBeenCalledWith([artist]);
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
      expect(spotify.getActiveArtistReleases).not.toHaveBeenCalled();
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

    it("SHALL never call Spotify catalog as primary source — only as last resort", async () => {
      const artist = makeArtist();
      const deezerAlbums = [makeRelease({ albumId: "dz-1" })];

      vi.mocked(deezer.searchArtist).mockResolvedValue({ id: 123, name: artist.name });
      vi.mocked(deezer.getArtistAlbums).mockResolvedValue(deezerAlbums);

      await service.getActiveArtistReleases([artist]);

      expect(spotify.getActiveArtistReleases).not.toHaveBeenCalled();
    });
  });

  describe("Scenario: User follow-source preservation", () => {
    it("SHALL only use Spotify service for catalog fallback, not for followed-artists list", async () => {
      const artist = makeArtist();

      vi.mocked(deezer.searchArtist).mockResolvedValue(null);
      vi.mocked(musicBrainz.searchArtist).mockResolvedValue(null);
      vi.mocked(spotify.getActiveArtistReleases).mockResolvedValue([makeRelease()]);

      await service.getActiveArtistReleases([artist]);

      // The service delegates release lookups and may use Spotify as last resort,
      // but it never attempts to fetch the followed-artists list — that is the
      // worker's responsibility via spotifyUserLibrarySyncService.getFollowedArtists().
      expect(spotify.getActiveArtistReleases).toHaveBeenCalledTimes(1);
      expect(spotify.getActiveArtistReleases).toHaveBeenCalledWith([artist]);
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
});
