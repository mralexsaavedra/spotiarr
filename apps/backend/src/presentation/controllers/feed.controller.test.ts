import type { ArtistRelease, FollowedArtist } from "@spotiarr/shared";
import type { Request, Response } from "express";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GetRecentReleasesUseCase } from "@/application/use-cases/feed/get-recent-releases.use-case";
import type { FeedRepository } from "@/infrastructure/database/feed.repository";
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
  return { json: vi.fn() } as unknown as Response;
}

function mockReq(): Request {
  return {} as unknown as Request;
}

function makeMocks() {
  const spotifyUserLibraryService = {
    getFollowedArtists: vi.fn().mockResolvedValue([makeFollowedArtist()]),
  } as unknown as SpotifyUserLibraryService;

  const feedRepository = {
    getArtists: vi.fn().mockResolvedValue([]),
  } as unknown as FeedRepository;

  const getRecentReleasesUseCase = {
    execute: vi.fn().mockResolvedValue([]),
  } as unknown as GetRecentReleasesUseCase;

  return { spotifyUserLibraryService, feedRepository, getRecentReleasesUseCase };
}

describe("FeedController", () => {
  let controller: FeedController;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
    controller = new FeedController(
      mocks.spotifyUserLibraryService,
      mocks.feedRepository,
      mocks.getRecentReleasesUseCase,
    );
  });

  describe("getRecentReleases", () => {
    it("delegates to use case and responds with its result", async () => {
      const releases = [makeRelease({ albumId: "r1" }), makeRelease({ albumId: "r2" })];
      vi.mocked(mocks.getRecentReleasesUseCase.execute).mockResolvedValue(releases);

      const res = mockRes();
      await controller.getRecentReleases(mockReq(), res);

      expect(mocks.getRecentReleasesUseCase.execute).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(releases);
    });

    it("responds with empty array when use case returns no releases", async () => {
      vi.mocked(mocks.getRecentReleasesUseCase.execute).mockResolvedValue([]);

      const res = mockRes();
      await controller.getRecentReleases(mockReq(), res);

      expect(res.json).toHaveBeenCalledWith([]);
    });
  });
});
