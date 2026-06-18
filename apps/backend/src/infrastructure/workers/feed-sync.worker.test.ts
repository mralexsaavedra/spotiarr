import type { ArtistRelease, FollowedArtist } from "@spotiarr/shared";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SYNC_STATUS, type FeedRepositoryPort } from "@/application/ports/feed-repository.port";
import type { SettingsPort } from "@/application/ports/settings.port";
import type { SpotifyUserLibraryPort } from "@/application/ports/spotify-user-library.port";
import type { ReleaseFeedService } from "../external/release-feed.service";
import type { AppEventBus } from "../messaging/app-event-bus";
import { runFeedSyncJob, type FeedSyncJobDependencies } from "./feed-sync.worker";

function makeFollowedArtist(overrides: Partial<FollowedArtist> = {}): FollowedArtist {
  return {
    id: "artist-1",
    name: "Test Artist",
    image: "https://image.test/1.jpg",
    spotifyUrl: "https://spotify.test/artist/1",
    ...overrides,
  };
}

function makeRelease(overrides: Partial<ArtistRelease> = {}): ArtistRelease {
  return {
    artistId: "artist-1",
    artistName: "Test Artist",
    artistImageUrl: "https://image.test/1.jpg",
    albumId: "album-1",
    albumName: "Test Album",
    albumType: "album",
    releaseDate: new Date().toISOString().slice(0, 10),
    coverUrl: null,
    ...overrides,
  };
}

function makeMockDeps(): FeedSyncJobDependencies {
  return {
    spotifyUserLibrarySyncService: {
      getFollowedArtists: vi.fn().mockResolvedValue([makeFollowedArtist()]),
    } as unknown as SpotifyUserLibraryPort,
    releaseFeedService: {
      getActiveArtistReleases: vi.fn().mockResolvedValue({
        releases: [makeRelease()],
        decisions: [
          {
            spotifyId: "artist-1",
            provider: "deezer",
            albumsFound: 1,
            newIdentityPersisted: false,
          },
        ],
      }),
    } as unknown as ReleaseFeedService,
    feedRepository: {
      setSyncState: vi.fn().mockResolvedValue(undefined),
      upsertArtists: vi.fn().mockResolvedValue(undefined),
      getActiveArtistIdsForReleasesSync: vi.fn().mockResolvedValue(["artist-1"]),
      upsertReleases: vi.fn().mockResolvedValue(undefined),
      updateArtistReleasesSyncedAt: vi.fn().mockResolvedValue(undefined),
      evictStaleFeedCache: vi.fn().mockResolvedValue(undefined),
    } as unknown as FeedRepositoryPort,
    eventBus: {
      emit: vi.fn(),
    } as unknown as AppEventBus,
    settingsService: {
      getNumber: vi.fn().mockResolvedValue(15),
    } as unknown as SettingsPort,
  };
}

describe("FeedSyncWorker — runFeedSyncJob", () => {
  let deps: FeedSyncJobDependencies;

  beforeEach(() => {
    deps = makeMockDeps();
  });

  describe("Scenario: User follow-source preservation", () => {
    it("SHALL obtain followed artists via Spotify user-library service", async () => {
      await runFeedSyncJob(deps);

      expect(deps.spotifyUserLibrarySyncService.getFollowedArtists).toHaveBeenCalledTimes(1);
      expect(deps.spotifyUserLibrarySyncService.getFollowedArtists).toHaveBeenCalledWith();
    });

    it("SHALL upsert followed artists into the feed repository", async () => {
      const artists = [makeFollowedArtist({ id: "a1" }), makeFollowedArtist({ id: "a2" })];
      vi.mocked(deps.spotifyUserLibrarySyncService.getFollowedArtists).mockResolvedValue(artists);

      await runFeedSyncJob(deps);

      expect(deps.feedRepository.upsertArtists).toHaveBeenCalledWith(artists);
    });
  });

  describe("Scenario: Provider fallback chain for catalog lookups", () => {
    it("SHALL route per-artist release lookup through ReleaseFeedService and NOT call direct Spotify catalog client", async () => {
      const artists = [makeFollowedArtist({ id: "artist-1", name: "Artist One" })];
      vi.mocked(deps.spotifyUserLibrarySyncService.getFollowedArtists).mockResolvedValue(artists);

      await runFeedSyncJob(deps);

      expect(deps.releaseFeedService.getActiveArtistReleases).toHaveBeenCalledWith(
        [{ id: "artist-1", name: "Artist One", imageUrl: "https://image.test/1.jpg" }],
        { lookbackDays: 15 },
      );
    });

    it("SHALL pass correct artist mapping to ReleaseFeedService when multiple artists are active", async () => {
      const artists = [
        makeFollowedArtist({ id: "a1", name: "Alpha", image: "img-a" }),
        makeFollowedArtist({ id: "a2", name: "Beta", image: "img-b" }),
      ];
      vi.mocked(deps.spotifyUserLibrarySyncService.getFollowedArtists).mockResolvedValue(artists);
      vi.mocked(deps.feedRepository.getActiveArtistIdsForReleasesSync).mockResolvedValue([
        "a2",
        "a1",
      ]);

      await runFeedSyncJob(deps);

      expect(deps.releaseFeedService.getActiveArtistReleases).toHaveBeenCalledWith(
        [
          { id: "a2", name: "Beta", imageUrl: "img-b" },
          { id: "a1", name: "Alpha", imageUrl: "img-a" },
        ],
        { lookbackDays: 15 },
      );
    });

    it("SHALL forward RELEASES_LOOKBACK_DAYS from settings to ReleaseFeedService", async () => {
      vi.mocked(deps.settingsService.getNumber).mockImplementation(async (key: string) => {
        if (key === "RELEASES_LOOKBACK_DAYS") return 7;
        return 15;
      });

      await runFeedSyncJob(deps);

      expect(deps.releaseFeedService.getActiveArtistReleases).toHaveBeenCalledWith(
        expect.any(Array),
        { lookbackDays: 7 },
      );
    });

    it("SHALL persist releases returned by ReleaseFeedService", async () => {
      const releases = [makeRelease({ albumId: "r1" }), makeRelease({ albumId: "r2" })];
      vi.mocked(deps.releaseFeedService.getActiveArtistReleases).mockResolvedValue({
        releases,
        decisions: [],
      });

      await runFeedSyncJob(deps);

      expect(deps.feedRepository.upsertReleases).toHaveBeenCalledWith(releases);
    });

    it("SHALL update sync timestamps for active artists", async () => {
      vi.mocked(deps.feedRepository.getActiveArtistIdsForReleasesSync).mockResolvedValue([
        "a1",
        "a2",
      ]);

      await runFeedSyncJob(deps);

      expect(deps.feedRepository.updateArtistReleasesSyncedAt).toHaveBeenCalledWith(["a1", "a2"]);
    });
  });

  describe("Scenario: Scope isolation to background feed sync", () => {
    it("SHALL only interact with ReleaseFeedService and Spotify follow-source for catalog concerns", async () => {
      await runFeedSyncJob(deps);

      // Worker must call getFollowedArtists (Spotify source) and releaseFeedService (catalog path)
      expect(deps.spotifyUserLibrarySyncService.getFollowedArtists).toHaveBeenCalledTimes(1);
      expect(deps.releaseFeedService.getActiveArtistReleases).toHaveBeenCalledTimes(1);
    });

    it("SHALL emit feed-updated event after successful sync", async () => {
      const artists = [makeFollowedArtist(), makeFollowedArtist({ id: "artist-2" })];
      vi.mocked(deps.spotifyUserLibrarySyncService.getFollowedArtists).mockResolvedValue(artists);
      vi.mocked(deps.releaseFeedService.getActiveArtistReleases).mockResolvedValue({
        releases: [makeRelease(), makeRelease({ albumId: "album-2" })],
        decisions: [],
      });

      await runFeedSyncJob(deps);

      expect(deps.eventBus.emit).toHaveBeenCalledWith("feed-updated", {
        artists: 2,
        releases: 2,
      });
    });
  });

  describe("Edge cases", () => {
    it("SHALL skip release sync when no active artists need updates", async () => {
      vi.mocked(deps.feedRepository.getActiveArtistIdsForReleasesSync).mockResolvedValue([]);

      await runFeedSyncJob(deps);

      expect(deps.releaseFeedService.getActiveArtistReleases).not.toHaveBeenCalled();
      expect(deps.feedRepository.upsertReleases).not.toHaveBeenCalled();
      expect(deps.feedRepository.setSyncState).toHaveBeenLastCalledWith(SYNC_STATUS.Idle);
    });

    it("SHALL handle circuit breaker open gracefully", async () => {
      const circuitError = new Error("Circuit breaker open") as Error & { errorCode: string };
      circuitError.errorCode = "circuit_open";
      vi.mocked(deps.spotifyUserLibrarySyncService.getFollowedArtists).mockRejectedValue(
        circuitError,
      );

      await runFeedSyncJob(deps);

      expect(deps.feedRepository.setSyncState).toHaveBeenLastCalledWith(SYNC_STATUS.Idle);
      expect(deps.eventBus.emit).not.toHaveBeenCalled();
    });

    it("SHALL set error state and rethrow on unexpected errors", async () => {
      vi.mocked(deps.spotifyUserLibrarySyncService.getFollowedArtists).mockRejectedValue(
        new Error("network failure"),
      );

      await expect(runFeedSyncJob(deps)).rejects.toThrow("network failure");
      expect(deps.feedRepository.setSyncState).toHaveBeenLastCalledWith(
        SYNC_STATUS.Error,
        "network failure",
      );
    });

    it("SHALL use MAX_ACTIVE_ARTISTS_PER_CYCLE from settings when positive", async () => {
      vi.mocked(deps.settingsService.getNumber).mockResolvedValue(42);

      await runFeedSyncJob(deps);

      expect(deps.feedRepository.getActiveArtistIdsForReleasesSync).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        42,
      );
    });

    it("SHALL fall back to default MAX_RELEASES_ARTISTS_PER_CYCLE when setting is zero or negative", async () => {
      vi.mocked(deps.settingsService.getNumber).mockResolvedValue(0);

      await runFeedSyncJob(deps);

      expect(deps.feedRepository.getActiveArtistIdsForReleasesSync).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        15,
      );
    });

    it("SHALL filter out undefined artists when active IDs contain artists not in followed list", async () => {
      const artists = [makeFollowedArtist({ id: "a1" })];
      vi.mocked(deps.spotifyUserLibrarySyncService.getFollowedArtists).mockResolvedValue(artists);
      vi.mocked(deps.feedRepository.getActiveArtistIdsForReleasesSync).mockResolvedValue([
        "a1",
        "a2",
      ]);

      await runFeedSyncJob(deps);

      // Only a1 is passed to releaseFeedService because a2 is not in the followed artists list
      expect(deps.releaseFeedService.getActiveArtistReleases).toHaveBeenCalledWith(
        [{ id: "a1", name: "Test Artist", imageUrl: "https://image.test/1.jpg" }],
        { lookbackDays: 15 },
      );
    });
  });
});
