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

  // T3.1 — R4-S2: searchAttempts increments on youtube_not_found
  describe("R4-S2: searchAttempts increments on each failed search attempt", () => {
    it("increments searchAttempts by 1 when youtube_not_found is returned", async () => {
      trackRepository.findOneWithPlaylist.mockResolvedValue(
        new Track(makeTrack({ searchAttempts: 2 })),
      );
      youtubeSearchService.findOnYoutubeOne.mockResolvedValue("");

      const persisted: ITrack[] = [];
      trackRepository.update.mockImplementation((_id: string, entity: Track) => {
        persisted.push(entity.toPrimitive());
        return Promise.resolve(undefined);
      });

      await useCase.execute(makeTrack({ searchAttempts: 2 }));

      const finalWrite = persisted.at(-1);
      expect(finalWrite?.searchAttempts).toBe(3);
    });

    it("increments searchAttempts when the search throws an exception", async () => {
      trackRepository.findOneWithPlaylist.mockResolvedValue(
        new Track(makeTrack({ searchAttempts: 1 })),
      );
      youtubeSearchService.findOnYoutubeOne.mockRejectedValue(new Error("yt down"));

      const persisted: ITrack[] = [];
      trackRepository.update.mockImplementation((_id: string, entity: Track) => {
        persisted.push(entity.toPrimitive());
        return Promise.resolve(undefined);
      });

      await useCase.execute(makeTrack({ searchAttempts: 1 }));

      const finalWrite = persisted.at(-1);
      expect(finalWrite?.searchAttempts).toBe(2);
    });
  });

  // T3.1 — R4-S4: successful search resets searchAttempts to 0 on Queued transition
  describe("R4-S4: successful search resets searchAttempts to 0", () => {
    it("resets searchAttempts to 0 when a YouTube URL is found", async () => {
      // Set SEARCH_MAX_ATTEMPTS high so cap guard doesn't fire on a track with 3 attempts
      settingsService.getNumber.mockImplementation((key: string) => {
        if (key === "SEARCH_MAX_ATTEMPTS") return Promise.resolve(5);
        return Promise.resolve(3);
      });

      trackRepository.findOneWithPlaylist.mockResolvedValue(
        new Track(makeTrack({ searchAttempts: 3 })),
      );
      youtubeSearchService.findOnYoutubeOne.mockResolvedValue("https://youtu.be/abc");

      const persisted: ITrack[] = [];
      trackRepository.update.mockImplementation((_id: string, entity: Track) => {
        persisted.push(entity.toPrimitive());
        return Promise.resolve(undefined);
      });

      await useCase.execute(makeTrack({ searchAttempts: 3 }));

      const finalWrite = persisted.at(-1);
      expect(finalWrite?.searchAttempts).toBe(0);
      expect(finalWrite?.status).toBe(TrackStatusEnum.Queued);
    });
  });

  // T3.1 — R4-S1: track at cap is NOT re-enqueued; terminal error is written
  describe("R4-S1: track at attempt cap stops being re-enqueued", () => {
    it("writes terminal Error and does not enqueue when searchAttempts >= SEARCH_MAX_ATTEMPTS", async () => {
      // SEARCH_MAX_ATTEMPTS default is 5; settingsService.getNumber returns 5 for it
      settingsService.getNumber.mockImplementation((key: string) => {
        if (key === "SEARCH_MAX_ATTEMPTS") return Promise.resolve(5);
        return Promise.resolve(3);
      });

      trackRepository.findOneWithPlaylist.mockResolvedValue(
        new Track(makeTrack({ searchAttempts: 5, status: TrackStatusEnum.Error })),
      );

      const persisted: ITrack[] = [];
      trackRepository.update.mockImplementation((_id: string, entity: Track) => {
        persisted.push(entity.toPrimitive());
        return Promise.resolve(undefined);
      });

      await useCase.execute(makeTrack({ searchAttempts: 5, status: TrackStatusEnum.Error }));

      expect(youtubeSearchService.findOnYoutubeOne).not.toHaveBeenCalled();
      expect(queueService.enqueueDownloadTrack).not.toHaveBeenCalled();
      const finalWrite = persisted.at(-1);
      expect(finalWrite?.status).toBe(TrackStatusEnum.Error);
    });

    it("still searches when searchAttempts is below cap", async () => {
      settingsService.getNumber.mockImplementation((key: string) => {
        if (key === "SEARCH_MAX_ATTEMPTS") return Promise.resolve(5);
        return Promise.resolve(3);
      });

      trackRepository.findOneWithPlaylist.mockResolvedValue(
        new Track(makeTrack({ searchAttempts: 4 })),
      );
      youtubeSearchService.findOnYoutubeOne.mockResolvedValue("https://youtu.be/abc");

      await useCase.execute(makeTrack({ searchAttempts: 4 }));

      expect(youtubeSearchService.findOnYoutubeOne).toHaveBeenCalledTimes(1);
    });
  });

  // R4 — terminal error codes short-circuit before the cap is reached
  describe("terminal error classification short-circuits the search", () => {
    it("does NOT re-search a track with a terminal error code even when below the cap", async () => {
      settingsService.getNumber.mockImplementation((key: string) => {
        if (key === "SEARCH_MAX_ATTEMPTS") return Promise.resolve(5);
        return Promise.resolve(3);
      });

      // youtube_not_found is terminal; attempts (1) are well below the cap (5)
      trackRepository.findOneWithPlaylist.mockResolvedValue(
        new Track(
          makeTrack({
            searchAttempts: 1,
            status: TrackStatusEnum.Error,
            error: "youtube_not_found",
          }),
        ),
      );

      await useCase.execute(
        makeTrack({ searchAttempts: 1, status: TrackStatusEnum.Error, error: "youtube_not_found" }),
      );

      expect(youtubeSearchService.findOnYoutubeOne).not.toHaveBeenCalled();
      expect(queueService.enqueueDownloadTrack).not.toHaveBeenCalled();
    });

    it("DOES re-search a track with a non-terminal (transient) error below the cap", async () => {
      settingsService.getNumber.mockImplementation((key: string) => {
        if (key === "SEARCH_MAX_ATTEMPTS") return Promise.resolve(5);
        return Promise.resolve(3);
      });

      trackRepository.findOneWithPlaylist.mockResolvedValue(
        new Track(
          makeTrack({ searchAttempts: 2, status: TrackStatusEnum.Error, error: "network timeout" }),
        ),
      );
      youtubeSearchService.findOnYoutubeOne.mockResolvedValue("https://youtu.be/abc");

      await useCase.execute(
        makeTrack({ searchAttempts: 2, status: TrackStatusEnum.Error, error: "network timeout" }),
      );

      expect(youtubeSearchService.findOnYoutubeOne).toHaveBeenCalledTimes(1);
    });
  });
});
