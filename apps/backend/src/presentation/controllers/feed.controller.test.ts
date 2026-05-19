import type { ArtistRelease, FollowedArtist } from "@spotiarr/shared";
import type { Request, Response } from "express";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SettingsService } from "@/application/services/settings.service";
import type { FeedRepository } from "@/infrastructure/database/feed.repository";
import type { ReleaseFeedService } from "@/infrastructure/external/release-feed.service";
import type { SpotifyUserLibraryService } from "@/infrastructure/external/spotify-user-library.service";
import { FeedController } from "./feed.controller";

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

function mockRes(): Response {
  return {
    json: vi.fn(),
  } as unknown as Response;
}

function mockReq(): Request {
  return {} as unknown as Request;
}

function makeMocks() {
  const spotifyUserLibraryService = {
    getFollowedArtists: vi.fn().mockResolvedValue([makeFollowedArtist()]),
  } as unknown as SpotifyUserLibraryService;

  const feedRepository = {
    getReleases: vi.fn().mockResolvedValue([]),
    upsertArtists: vi.fn().mockResolvedValue(undefined),
    upsertReleases: vi.fn().mockResolvedValue(undefined),
  } as unknown as FeedRepository;

  const settingsService = {
    getNumber: vi.fn().mockResolvedValue(30),
  } as unknown as SettingsService;

  const releaseFeedService = {
    getActiveArtistReleases: vi.fn().mockResolvedValue({ releases: [], decisions: [] }),
  } as unknown as ReleaseFeedService;

  return { spotifyUserLibraryService, feedRepository, settingsService, releaseFeedService };
}

describe("FeedController — getRecentReleases", () => {
  let controller: FeedController;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
    controller = new FeedController(
      mocks.spotifyUserLibraryService,
      mocks.feedRepository,
      mocks.settingsService,
      mocks.releaseFeedService,
    );
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  describe("Scenario: Warm cache — no fallback", () => {
    it("SHALL serve from DB cache and NOT invoke fallback collaborators", async () => {
      const cachedReleases = [makeRelease({ albumId: "cached-1" })];
      vi.mocked(mocks.feedRepository.getReleases).mockResolvedValue(cachedReleases);

      const res = mockRes();
      await controller.getRecentReleases(mockReq(), res);

      expect(res.json).toHaveBeenCalledWith(cachedReleases);
      expect(mocks.spotifyUserLibraryService.getFollowedArtists).not.toHaveBeenCalled();
      expect(mocks.releaseFeedService.getActiveArtistReleases).not.toHaveBeenCalled();
      expect(mocks.feedRepository.upsertArtists).not.toHaveBeenCalled();
      expect(mocks.feedRepository.upsertReleases).not.toHaveBeenCalled();
    });
  });

  describe("Scenario: Empty cache — happy path", () => {
    it("SHALL call getFollowedArtists then getActiveArtistReleases and warm the DB before responding", async () => {
      const artists = [makeFollowedArtist({ id: "a1" }), makeFollowedArtist({ id: "a2" })];
      const releases = [makeRelease({ albumId: "r1" }), makeRelease({ albumId: "r2" })];

      vi.mocked(mocks.feedRepository.getReleases).mockResolvedValue([]);
      vi.mocked(mocks.spotifyUserLibraryService.getFollowedArtists).mockResolvedValue(artists);
      vi.mocked(mocks.releaseFeedService.getActiveArtistReleases).mockResolvedValue({
        releases,
        decisions: [],
      });

      const res = mockRes();
      await controller.getRecentReleases(mockReq(), res);

      expect(mocks.spotifyUserLibraryService.getFollowedArtists).toHaveBeenCalledTimes(1);
      expect(mocks.releaseFeedService.getActiveArtistReleases).toHaveBeenCalledWith(
        [
          { id: "a1", name: "Test Artist", imageUrl: "https://image.test/1.jpg" },
          { id: "a2", name: "Test Artist", imageUrl: "https://image.test/1.jpg" },
        ],
        { lookbackDays: 30 },
      );
      expect(mocks.feedRepository.upsertArtists).toHaveBeenCalledWith(artists);
      expect(mocks.feedRepository.upsertReleases).toHaveBeenCalledWith(releases);
      expect(res.json).toHaveBeenCalledWith(releases);
    });

    it("SHALL call upsertArtists before upsertReleases (ADR-002 write order)", async () => {
      const callOrder: string[] = [];
      vi.mocked(mocks.feedRepository.getReleases).mockResolvedValue([]);
      vi.mocked(mocks.releaseFeedService.getActiveArtistReleases).mockResolvedValue({
        releases: [makeRelease()],
        decisions: [],
      });
      vi.mocked(mocks.feedRepository.upsertArtists).mockImplementation(async () => {
        callOrder.push("upsertArtists");
      });
      vi.mocked(mocks.feedRepository.upsertReleases).mockImplementation(async () => {
        callOrder.push("upsertReleases");
      });

      await controller.getRecentReleases(mockReq(), mockRes());

      expect(callOrder).toEqual(["upsertArtists", "upsertReleases"]);
    });
  });

  describe("Scenario: Empty cache + empty cascade (ADR-003)", () => {
    it("SHALL call upsertArtists but NOT upsertReleases, and respond with empty array", async () => {
      const artists = [makeFollowedArtist()];
      vi.mocked(mocks.feedRepository.getReleases).mockResolvedValue([]);
      vi.mocked(mocks.spotifyUserLibraryService.getFollowedArtists).mockResolvedValue(artists);
      vi.mocked(mocks.releaseFeedService.getActiveArtistReleases).mockResolvedValue({
        releases: [],
        decisions: [],
      });

      const res = mockRes();
      await controller.getRecentReleases(mockReq(), res);

      expect(mocks.feedRepository.upsertArtists).toHaveBeenCalledWith(artists);
      expect(mocks.feedRepository.upsertReleases).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe("Scenario: Missing or expired token (ADR-004)", () => {
    it("SHALL propagate error from getFollowedArtists without calling upserts", async () => {
      vi.mocked(mocks.feedRepository.getReleases).mockResolvedValue([]);
      vi.mocked(mocks.spotifyUserLibraryService.getFollowedArtists).mockRejectedValue(
        new Error("Spotify user token expired or invalid"),
      );

      await expect(controller.getRecentReleases(mockReq(), mockRes())).rejects.toThrow(
        "Spotify user token expired or invalid",
      );

      expect(mocks.feedRepository.upsertArtists).not.toHaveBeenCalled();
      expect(mocks.feedRepository.upsertReleases).not.toHaveBeenCalled();
    });
  });

  describe("Scenario: lookbackDays forwarded correctly", () => {
    it("SHALL pass lookbackDays from settings to releaseFeedService.getActiveArtistReleases", async () => {
      vi.mocked(mocks.settingsService.getNumber).mockResolvedValue(7);
      vi.mocked(mocks.feedRepository.getReleases).mockResolvedValue([]);
      vi.mocked(mocks.releaseFeedService.getActiveArtistReleases).mockResolvedValue({
        releases: [],
        decisions: [],
      });

      await controller.getRecentReleases(mockReq(), mockRes());

      expect(mocks.releaseFeedService.getActiveArtistReleases).toHaveBeenCalledWith(
        expect.any(Array),
        { lookbackDays: 7 },
      );
    });
  });
});
