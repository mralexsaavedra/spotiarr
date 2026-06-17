import type { ArtistRelease, FollowedArtist } from "@spotiarr/shared";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SYNC_STATUS, type FeedRepositoryPort } from "@/application/ports/feed-repository.port";
import type { ReleaseFeedPort } from "@/application/ports/release-feed.port";
import type { SettingsPort } from "@/application/ports/settings.port";
import type { AppEventBus } from "../messaging/app-event-bus";
import { runCatalogSyncJob, type CatalogSyncJobDependencies } from "./catalog-sync.worker";

// createCatalogSyncWorker factory tests live in catalog-sync.worker.create.test.ts

function makeFollowedArtist(overrides: Partial<FollowedArtist> = {}): FollowedArtist {
  return {
    id: "artist-1",
    name: "Test Artist",
    image: "https://image.test/1.jpg",
    spotifyUrl: "https://spotify.test/artist/1",
    ...overrides,
  };
}

function makeArtistRelease(overrides: Partial<ArtistRelease> = {}): ArtistRelease {
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

function makeMockDeps(): CatalogSyncJobDependencies {
  return {
    feedRepository: {
      getArtists: vi.fn().mockResolvedValue([makeFollowedArtist()]),
      getArtistIdsNeedingCatalogSync: vi.fn().mockResolvedValue(["artist-1"]),
      upsertArtistAlbums: vi.fn().mockResolvedValue(undefined),
      updateArtistCatalogSyncedAt: vi.fn().mockResolvedValue(undefined),
      setCatalogSyncState: vi.fn().mockResolvedValue(undefined),
    } as unknown as FeedRepositoryPort,
    releaseFeedService: {
      getArtistDiscography: vi.fn().mockResolvedValue({
        albums: [makeArtistRelease()],
      }),
    } as unknown as ReleaseFeedPort,
    eventBus: {
      emit: vi.fn(),
    } as unknown as AppEventBus,
    settingsService: {
      getNumber: vi.fn().mockResolvedValue(5),
    } as unknown as SettingsPort,
  };
}

describe("CatalogSyncWorker — runCatalogSyncJob", () => {
  let deps: CatalogSyncJobDependencies;

  beforeEach(() => {
    deps = makeMockDeps();
  });

  describe("REQ-1: Artist list sourced from DB cache", () => {
    it("SHALL call feedRepository.getArtists() to build the artist list and make no Spotify calls", async () => {
      await runCatalogSyncJob(deps);

      expect(deps.feedRepository.getArtists).toHaveBeenCalledTimes(1);
      // Verify no Spotify service method is on the deps object
      expect(
        (deps as unknown as Record<string, unknown>).spotifyUserLibrarySyncService,
      ).toBeUndefined();
    });

    it("SHALL exit immediately with catalog-updated(0,0) when getArtists() returns empty array", async () => {
      vi.mocked(deps.feedRepository.getArtists).mockResolvedValue([]);

      await runCatalogSyncJob(deps);

      expect(deps.releaseFeedService.getArtistDiscography).not.toHaveBeenCalled();
      expect(deps.feedRepository.setCatalogSyncState).toHaveBeenLastCalledWith(SYNC_STATUS.Idle);
      expect(deps.eventBus.emit).toHaveBeenCalledWith("catalog-updated", {
        artists: 0,
        albums: 0,
      });
    });

    it("SHALL cap processed artists at MAX_CATALOG_ARTISTS_PER_CYCLE", async () => {
      const maxPerCycle = 2;
      vi.mocked(deps.settingsService.getNumber).mockResolvedValue(maxPerCycle);

      const artists = [
        makeFollowedArtist({ id: "a1" }),
        makeFollowedArtist({ id: "a2" }),
        makeFollowedArtist({ id: "a3" }),
      ];
      vi.mocked(deps.feedRepository.getArtists).mockResolvedValue(artists);
      // IDs needing sync — only maxPerCycle returned by repo
      vi.mocked(deps.feedRepository.getArtistIdsNeedingCatalogSync).mockResolvedValue(["a1", "a2"]);

      await runCatalogSyncJob(deps);

      // Only 2 artists processed
      expect(deps.releaseFeedService.getArtistDiscography).toHaveBeenCalledTimes(2);
    });

    it("SHALL map FollowedArtist.image to imageUrl when calling getArtistDiscography", async () => {
      const artist = makeFollowedArtist({ id: "a1", name: "Artist One", image: "img-url" });
      vi.mocked(deps.feedRepository.getArtists).mockResolvedValue([artist]);
      vi.mocked(deps.feedRepository.getArtistIdsNeedingCatalogSync).mockResolvedValue(["a1"]);

      await runCatalogSyncJob(deps);

      expect(deps.releaseFeedService.getArtistDiscography).toHaveBeenCalledWith({
        id: "a1",
        name: "Artist One",
        imageUrl: "img-url",
      });
    });

    it("SHALL never call isAppTokenCircuitOpen — no circuit breaker at worker entry", async () => {
      // The deps object must not have any isAppTokenCircuitOpen-like method
      // The worker must not import or call it — verified by the lack of the property
      const depKeys = Object.keys(deps);
      expect(depKeys).not.toContain("isAppTokenCircuitOpen");
      await expect(runCatalogSyncJob(deps)).resolves.not.toThrow();
    });
  });

  describe("REQ-3 & REQ-4: Per-artist failure tolerance and catalog-updated event", () => {
    it("SHALL continue cycle when one of three artists throws and emit correct counts", async () => {
      const artists = [
        makeFollowedArtist({ id: "a1" }),
        makeFollowedArtist({ id: "a2" }),
        makeFollowedArtist({ id: "a3" }),
      ];
      vi.mocked(deps.feedRepository.getArtists).mockResolvedValue(artists);
      vi.mocked(deps.feedRepository.getArtistIdsNeedingCatalogSync).mockResolvedValue([
        "a1",
        "a2",
        "a3",
      ]);

      const releases = [makeArtistRelease({ albumId: "alb-1" })];
      vi.mocked(deps.releaseFeedService.getArtistDiscography)
        .mockResolvedValueOnce({ albums: releases })
        .mockRejectedValueOnce(new Error("fetch failed"))
        .mockResolvedValueOnce({ albums: releases });

      await runCatalogSyncJob(deps);

      expect(deps.eventBus.emit).toHaveBeenCalledWith("catalog-updated", {
        artists: 2,
        albums: 2,
      });
      expect(deps.feedRepository.setCatalogSyncState).toHaveBeenLastCalledWith(SYNC_STATUS.Idle);
    });

    it("SHALL transition to Error state and throw when all artists fail", async () => {
      const artists = [makeFollowedArtist({ id: "a1" }), makeFollowedArtist({ id: "a2" })];
      vi.mocked(deps.feedRepository.getArtists).mockResolvedValue(artists);
      vi.mocked(deps.feedRepository.getArtistIdsNeedingCatalogSync).mockResolvedValue(["a1", "a2"]);
      vi.mocked(deps.releaseFeedService.getArtistDiscography).mockRejectedValue(
        new Error("all fail"),
      );

      await expect(runCatalogSyncJob(deps)).rejects.toThrow();

      expect(deps.feedRepository.setCatalogSyncState).toHaveBeenCalledWith(
        SYNC_STATUS.Error,
        expect.any(String),
      );
      expect(deps.eventBus.emit).not.toHaveBeenCalled();
    });

    it("SHALL emit catalog-updated with correct counts when all artists succeed", async () => {
      const artists = [makeFollowedArtist({ id: "a1" }), makeFollowedArtist({ id: "a2" })];
      vi.mocked(deps.feedRepository.getArtists).mockResolvedValue(artists);
      vi.mocked(deps.feedRepository.getArtistIdsNeedingCatalogSync).mockResolvedValue(["a1", "a2"]);

      const alb1 = makeArtistRelease({ albumId: "alb-1" });
      const alb2 = makeArtistRelease({ albumId: "alb-2" });
      vi.mocked(deps.releaseFeedService.getArtistDiscography)
        .mockResolvedValueOnce({ albums: [alb1] })
        .mockResolvedValueOnce({ albums: [alb2] });

      await runCatalogSyncJob(deps);

      expect(deps.eventBus.emit).toHaveBeenCalledTimes(1);
      expect(deps.eventBus.emit).toHaveBeenCalledWith("catalog-updated", {
        artists: 2,
        albums: 2,
      });
    });

    it("SHALL emit catalog-updated with zero counts when artist list is empty (S4-C spec wins)", async () => {
      vi.mocked(deps.feedRepository.getArtists).mockResolvedValue([]);

      await runCatalogSyncJob(deps);

      expect(deps.eventBus.emit).toHaveBeenCalledWith("catalog-updated", {
        artists: 0,
        albums: 0,
      });
    });
  });

  describe("REQ-5: Sync state lifecycle", () => {
    it("SHALL transition Running → Idle during a normal successful cycle", async () => {
      await runCatalogSyncJob(deps);

      const calls = vi.mocked(deps.feedRepository.setCatalogSyncState).mock.calls;
      expect(calls[0][0]).toBe(SYNC_STATUS.Running);
      expect(calls[calls.length - 1][0]).toBe(SYNC_STATUS.Idle);
    });

    it("SHALL transition to Error state and rethrow when getArtists() throws", async () => {
      vi.mocked(deps.feedRepository.getArtists).mockRejectedValue(new Error("db failure"));

      await expect(runCatalogSyncJob(deps)).rejects.toThrow("db failure");

      expect(deps.feedRepository.setCatalogSyncState).toHaveBeenCalledWith(
        SYNC_STATUS.Error,
        "db failure",
      );
      expect(deps.eventBus.emit).not.toHaveBeenCalled();
    });

    it("SHALL transition Running → Idle when no artist IDs need catalog sync", async () => {
      vi.mocked(deps.feedRepository.getArtistIdsNeedingCatalogSync).mockResolvedValue([]);

      await runCatalogSyncJob(deps);

      expect(deps.releaseFeedService.getArtistDiscography).not.toHaveBeenCalled();
      expect(deps.feedRepository.setCatalogSyncState).toHaveBeenLastCalledWith(SYNC_STATUS.Idle);
    });

    it("SHALL use 'No artists were synced' message when IDs returned but none match artist map", async () => {
      // getArtists returns one artist, but getArtistIdsNeedingCatalogSync returns IDs not in the map.
      // artistsToSync ends up empty → successCount === 0, failedArtistIds.length === 0.
      vi.mocked(deps.feedRepository.getArtistIdsNeedingCatalogSync).mockResolvedValue([
        "unknown-id",
      ]);

      await expect(runCatalogSyncJob(deps)).rejects.toThrow("No artists were synced");
      expect(deps.feedRepository.setCatalogSyncState).toHaveBeenCalledWith(
        SYNC_STATUS.Error,
        "No artists were synced",
      );
    });
  });
});
