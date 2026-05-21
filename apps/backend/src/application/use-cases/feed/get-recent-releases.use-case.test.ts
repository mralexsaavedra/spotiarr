import type { ArtistRelease, FollowedArtist } from "@spotiarr/shared";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SettingsService } from "@/application/services/settings.service";
import type { FeedRepository } from "@/infrastructure/database/feed.repository";
import type { ReleaseFeedService } from "@/infrastructure/external/release-feed.service";
import type { SpotifyUserLibraryService } from "@/infrastructure/external/spotify-user-library.service";
import { GetRecentReleasesUseCase } from "./get-recent-releases.use-case";

function makeArtist(overrides: Partial<FollowedArtist> = {}): FollowedArtist {
  return {
    id: "a1",
    name: "Artist One",
    image: "https://img/1.jpg",
    spotifyUrl: "https://spotify/a1",
    ...overrides,
  };
}

function makeRelease(overrides: Partial<ArtistRelease> = {}): ArtistRelease {
  return {
    artistId: "a1",
    artistName: "Artist One",
    artistImageUrl: null,
    albumId: "al1",
    albumName: "Album One",
    albumType: "album",
    releaseDate: "2026-01-01",
    coverUrl: null,
    ...overrides,
  };
}

function makeDeps() {
  const feedRepository = {
    getReleases: vi.fn().mockResolvedValue([]),
    upsertArtists: vi.fn().mockResolvedValue(undefined),
    upsertReleases: vi.fn().mockResolvedValue(undefined),
  } as unknown as FeedRepository;

  const spotifyUserLibraryService = {
    getFollowedArtists: vi.fn().mockResolvedValue([makeArtist()]),
  } as unknown as SpotifyUserLibraryService;

  const releaseFeedService = {
    getActiveArtistReleases: vi.fn().mockResolvedValue({ releases: [], decisions: [] }),
  } as unknown as ReleaseFeedService;

  const settingsService = {
    getNumber: vi.fn().mockResolvedValue(30),
  } as unknown as SettingsService;

  return { feedRepository, spotifyUserLibraryService, releaseFeedService, settingsService };
}

describe("GetRecentReleasesUseCase", () => {
  let useCase: GetRecentReleasesUseCase;
  let deps: ReturnType<typeof makeDeps>;

  beforeEach(() => {
    deps = makeDeps();
    useCase = new GetRecentReleasesUseCase(
      deps.feedRepository,
      deps.spotifyUserLibraryService,
      deps.releaseFeedService,
      deps.settingsService,
    );
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("returns cached releases without triggering warm when cache is fresh", async () => {
    const cached = [makeRelease({ albumId: "cached-1" })];
    vi.mocked(deps.feedRepository.getReleases).mockResolvedValue(cached);

    const result = await useCase.execute();

    expect(result).toEqual(cached);
    expect(deps.spotifyUserLibraryService.getFollowedArtists).not.toHaveBeenCalled();
    expect(deps.releaseFeedService.getActiveArtistReleases).not.toHaveBeenCalled();
    expect(deps.feedRepository.upsertArtists).not.toHaveBeenCalled();
  });

  it("warms cache and returns fallback releases when cache is empty and artists exist", async () => {
    const artists = [makeArtist({ id: "a1" }), makeArtist({ id: "a2" })];
    const fallback = [makeRelease({ albumId: "r1" }), makeRelease({ albumId: "r2" })];
    vi.mocked(deps.feedRepository.getReleases).mockResolvedValue([]);
    vi.mocked(deps.spotifyUserLibraryService.getFollowedArtists).mockResolvedValue(artists);
    vi.mocked(deps.releaseFeedService.getActiveArtistReleases).mockResolvedValue({
      releases: fallback,
      decisions: [],
    });

    const result = await useCase.execute();

    expect(deps.feedRepository.upsertArtists).toHaveBeenCalledWith(artists);
    expect(deps.feedRepository.upsertReleases).toHaveBeenCalledWith(fallback);
    expect(result).toEqual(fallback);
  });

  it("upserts artists but skips upsertReleases and returns empty when warm yields 0 releases", async () => {
    const artists = [makeArtist()];
    vi.mocked(deps.feedRepository.getReleases).mockResolvedValue([]);
    vi.mocked(deps.spotifyUserLibraryService.getFollowedArtists).mockResolvedValue(artists);
    vi.mocked(deps.releaseFeedService.getActiveArtistReleases).mockResolvedValue({
      releases: [],
      decisions: [],
    });

    const result = await useCase.execute();

    expect(deps.feedRepository.upsertArtists).toHaveBeenCalledWith(artists);
    expect(deps.feedRepository.upsertReleases).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("propagates error from getFollowedArtists without calling upserts", async () => {
    vi.mocked(deps.feedRepository.getReleases).mockResolvedValue([]);
    vi.mocked(deps.spotifyUserLibraryService.getFollowedArtists).mockRejectedValue(
      new Error("token expired"),
    );

    await expect(useCase.execute()).rejects.toThrow("token expired");

    expect(deps.feedRepository.upsertArtists).not.toHaveBeenCalled();
    expect(deps.feedRepository.upsertReleases).not.toHaveBeenCalled();
  });
});
