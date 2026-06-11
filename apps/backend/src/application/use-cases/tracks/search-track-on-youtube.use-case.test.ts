import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Track } from "@/domain/entities/track.entity";
import { SearchTrackOnYoutubeUseCase } from "./search-track-on-youtube.use-case";

function makeTrack(overrides: Partial<ITrack> = {}): ITrack {
  return {
    id: "track-1",
    name: "Song",
    artist: "Artist",
    status: TrackStatusEnum.New,
    ...overrides,
  };
}

describe("SearchTrackOnYoutubeUseCase", () => {
  let trackRepository: {
    findOneWithPlaylist: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let youtubeSearchService: { findOnYoutubeOne: ReturnType<typeof vi.fn> };
  let settingsService: { getNumber: ReturnType<typeof vi.fn> };
  let queueService: { enqueueDownloadTrack: ReturnType<typeof vi.fn> };
  let eventBus: { emit: ReturnType<typeof vi.fn> };
  let useCase: SearchTrackOnYoutubeUseCase;

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    trackRepository = {
      findOneWithPlaylist: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    };
    youtubeSearchService = { findOnYoutubeOne: vi.fn() };
    settingsService = { getNumber: vi.fn().mockResolvedValue(3) };
    queueService = { enqueueDownloadTrack: vi.fn().mockResolvedValue(undefined) };
    eventBus = { emit: vi.fn() };

    useCase = new SearchTrackOnYoutubeUseCase(
      trackRepository as never,
      youtubeSearchService as never,
      settingsService as never,
      queueService as never,
      eventBus as never,
    );
  });

  it("returns early when the track has no id", async () => {
    await useCase.execute(makeTrack({ id: undefined }));
    expect(trackRepository.findOneWithPlaylist).not.toHaveBeenCalled();
  });

  it("returns early when the track is not found", async () => {
    trackRepository.findOneWithPlaylist.mockResolvedValue(null);
    await useCase.execute(makeTrack());
    expect(youtubeSearchService.findOnYoutubeOne).not.toHaveBeenCalled();
  });

  it("searches, queues, and fans out to the download queue on success", async () => {
    trackRepository.findOneWithPlaylist.mockResolvedValue(new Track(makeTrack()));
    youtubeSearchService.findOnYoutubeOne.mockResolvedValue("https://youtu.be/abc");

    await useCase.execute(makeTrack());

    expect(queueService.enqueueDownloadTrack).toHaveBeenCalledTimes(1);
    const [enqueued, opts] = queueService.enqueueDownloadTrack.mock.calls[0];
    expect(enqueued.status).toBe(TrackStatusEnum.Queued);
    expect(enqueued.youtubeUrl).toBe("https://youtu.be/abc");
    expect(opts).toEqual({ maxRetries: 3 });
  });

  it("skips the search when a youtubeUrl is already set", async () => {
    trackRepository.findOneWithPlaylist.mockResolvedValue(
      new Track(makeTrack({ youtubeUrl: "https://youtu.be/preset" })),
    );

    await useCase.execute(makeTrack());

    expect(youtubeSearchService.findOnYoutubeOne).not.toHaveBeenCalled();
    expect(queueService.enqueueDownloadTrack).toHaveBeenCalledTimes(1);
  });

  it("marks the track as Error and does not enqueue when no url is found", async () => {
    trackRepository.findOneWithPlaylist.mockResolvedValue(new Track(makeTrack()));
    youtubeSearchService.findOnYoutubeOne.mockResolvedValue("");

    await useCase.execute(makeTrack());

    const finalStatus = trackRepository.update.mock.calls.at(-1)?.[1].status;
    expect(finalStatus).toBe(TrackStatusEnum.Error);
    expect(queueService.enqueueDownloadTrack).not.toHaveBeenCalled();
  });

  it("captures the error message and does not enqueue when the search throws", async () => {
    trackRepository.findOneWithPlaylist.mockResolvedValue(new Track(makeTrack()));
    youtubeSearchService.findOnYoutubeOne.mockRejectedValue(new Error("yt down"));

    const persisted: { status?: string; error?: string }[] = [];
    trackRepository.update.mockImplementation((_id, entity: Track) => {
      const { status, error } = entity.toPrimitive();
      persisted.push({ status, error });
      return Promise.resolve(undefined);
    });

    await useCase.execute(makeTrack());

    expect(persisted.at(-1)).toEqual({ status: TrackStatusEnum.Error, error: "yt down" });
    expect(queueService.enqueueDownloadTrack).not.toHaveBeenCalled();
  });

  it.each([
    [0, 3],
    [11, 3],
    [-1, 3],
    [5, 5],
    [1, 1],
    [10, 10],
  ])("clamps DOWNLOAD_MAX_RETRIES %i to %i", async (setting, expected) => {
    trackRepository.findOneWithPlaylist.mockResolvedValue(new Track(makeTrack()));
    youtubeSearchService.findOnYoutubeOne.mockResolvedValue("https://youtu.be/abc");
    settingsService.getNumber.mockResolvedValue(setting);

    await useCase.execute(makeTrack());

    expect(queueService.enqueueDownloadTrack).toHaveBeenCalledWith(expect.anything(), {
      maxRetries: expected,
    });
  });
});
