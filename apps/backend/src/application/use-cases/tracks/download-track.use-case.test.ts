import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Track } from "@/domain/entities/track.entity";
import { DownloadTrackUseCase } from "./download-track.use-case";

function makeTrack(overrides: Partial<ITrack> = {}): ITrack {
  return {
    id: "track-1",
    name: "Song",
    artist: "Artist",
    status: TrackStatusEnum.New,
    playlistId: "pl-1",
    ...overrides,
  };
}

describe("DownloadTrackUseCase", () => {
  let trackRepository: {
    findOne: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findOneWithPlaylist: ReturnType<typeof vi.fn>;
    markDownloadingIfNotAlready: ReturnType<typeof vi.fn>;
    updateStatusIf: ReturnType<typeof vi.fn>;
  };
  let youtubeDownloadService: { downloadAndFormat: ReturnType<typeof vi.fn> };
  let trackFileHelper: {
    getFolderName: ReturnType<typeof vi.fn>;
    ensureParentDirectory: ReturnType<typeof vi.fn>;
  };
  let playlistRepository: { findOne: ReturnType<typeof vi.fn> };
  let downloadHistoryRepository: { createFromTrack: ReturnType<typeof vi.fn> };
  let eventBus: { emit: ReturnType<typeof vi.fn> };
  let trackPostProcessingService: {
    process: ReturnType<typeof vi.fn>;
    updatePlaylistM3u: ReturnType<typeof vi.fn>;
  };
  let useCase: DownloadTrackUseCase;

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    trackRepository = {
      findOne: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      findOneWithPlaylist: vi.fn(),
      markDownloadingIfNotAlready: vi.fn().mockResolvedValue(true),
      updateStatusIf: vi.fn().mockResolvedValue(true),
    };
    youtubeDownloadService = { downloadAndFormat: vi.fn().mockResolvedValue({}) };
    trackFileHelper = {
      getFolderName: vi.fn().mockResolvedValue("/music/Artist/Song"),
      ensureParentDirectory: vi.fn().mockResolvedValue(undefined),
    };
    playlistRepository = { findOne: vi.fn().mockResolvedValue(null) };
    downloadHistoryRepository = { createFromTrack: vi.fn().mockResolvedValue(undefined) };
    eventBus = { emit: vi.fn() };
    trackPostProcessingService = {
      process: vi.fn().mockResolvedValue(undefined),
      updatePlaylistM3u: vi.fn().mockResolvedValue(undefined),
    };

    useCase = new DownloadTrackUseCase(
      trackRepository as never,
      youtubeDownloadService as never,
      trackFileHelper as never,
      playlistRepository as never,
      downloadHistoryRepository as never,
      eventBus as never,
      trackPostProcessingService as never,
    );
  });

  it("returns early when track data has no id", async () => {
    await useCase.execute(makeTrack({ id: undefined }));
    expect(trackRepository.findOne).not.toHaveBeenCalled();
  });

  it("returns early when the track is not found", async () => {
    trackRepository.findOne.mockResolvedValue(null);
    await useCase.execute(makeTrack());
    expect(youtubeDownloadService.downloadAndFormat).not.toHaveBeenCalled();
  });

  it("throws a 400 AppError when required fields are missing", async () => {
    const track = new Track(makeTrack({ name: "" }));
    trackRepository.findOne.mockResolvedValue(track);

    await expect(useCase.execute(makeTrack({ name: "" }))).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("transitions New -> Downloading -> Completed and persists each step", async () => {
    const track = new Track(makeTrack());
    trackRepository.findOne.mockResolvedValue(track);
    trackRepository.findOneWithPlaylist.mockResolvedValue(new Track(makeTrack()));

    await useCase.execute(makeTrack());

    // Downloading is claimed via the CAS guard, then the terminal write goes
    // through updateStatusIf (expecting the Downloading state) with Completed.
    expect(trackRepository.markDownloadingIfNotAlready).toHaveBeenCalledWith(track.id);
    const [, expectedStatus, patch] = trackRepository.updateStatusIf.mock.calls.at(-1) as [
      string,
      TrackStatusEnum,
      { status?: string },
    ];
    expect(expectedStatus).toBe(TrackStatusEnum.Downloading);
    expect(patch.status).toBe(TrackStatusEnum.Completed);
  });

  it("writes history and updates the M3U only after the track is marked completed", async () => {
    const track = new Track(makeTrack());
    trackRepository.findOne.mockResolvedValue(track);
    trackRepository.findOneWithPlaylist.mockResolvedValue(new Track(makeTrack()));

    await useCase.execute(makeTrack());

    // Final DB persist (Completed) must happen before M3U generation.
    const completedUpdateOrder = trackRepository.updateStatusIf.mock.invocationCallOrder[0];
    const m3uOrder = trackPostProcessingService.updatePlaylistM3u.mock.invocationCallOrder[0];
    const historyOrder = downloadHistoryRepository.createFromTrack.mock.invocationCallOrder[0];

    expect(completedUpdateOrder).toBeLessThan(historyOrder);
    expect(historyOrder).toBeLessThan(m3uOrder);
    expect(eventBus.emit).toHaveBeenCalledWith("download-history-updated");
  });

  it("emits playlists-updated when entering Downloading and after completion", async () => {
    const track = new Track(makeTrack());
    trackRepository.findOne.mockResolvedValue(track);
    trackRepository.findOneWithPlaylist.mockResolvedValue(new Track(makeTrack()));

    await useCase.execute(makeTrack());

    const playlistEmits = eventBus.emit.mock.calls.filter((c) => c[0] === "playlists-updated");
    expect(playlistEmits).toHaveLength(2);
  });

  it("marks the track as Error and skips history/M3U when the download fails", async () => {
    const track = new Track(makeTrack());
    trackRepository.findOne.mockResolvedValue(track);
    youtubeDownloadService.downloadAndFormat.mockRejectedValue(new Error("boom"));

    const persisted: { status?: string; error?: string }[] = [];
    trackRepository.updateStatusIf.mockImplementation(
      (_id, _expected, patch: { status?: string; error?: string }) => {
        persisted.push({ status: patch.status, error: patch.error });
        return Promise.resolve(true);
      },
    );

    await useCase.execute(makeTrack());

    expect(persisted.at(-1)).toEqual({ status: TrackStatusEnum.Error, error: "boom" });
    expect(downloadHistoryRepository.createFromTrack).not.toHaveBeenCalled();
    expect(trackPostProcessingService.updatePlaylistM3u).not.toHaveBeenCalled();
  });

  it("passes the playlist name to the file helper only for real playlists", async () => {
    const track = new Track(makeTrack({ playlistId: "pl-1" }));
    trackRepository.findOne.mockResolvedValue(track);
    trackRepository.findOneWithPlaylist.mockResolvedValue(new Track(makeTrack()));
    playlistRepository.findOne.mockResolvedValue({ type: "playlist", name: "My Mix" });

    await useCase.execute(makeTrack());

    expect(trackFileHelper.getFolderName).toHaveBeenCalledWith(expect.anything(), "My Mix");
  });

  it("passes the playlist name to the file helper for AI playlists", async () => {
    const track = new Track(makeTrack({ playlistId: "pl-ai" }));
    trackRepository.findOne.mockResolvedValue(track);
    trackRepository.findOneWithPlaylist.mockResolvedValue(new Track(makeTrack()));
    playlistRepository.findOne.mockResolvedValue({ type: "ai", name: "AI: rock 80s" });

    await useCase.execute(makeTrack());

    expect(trackFileHelper.getFolderName).toHaveBeenCalledWith(expect.anything(), "AI: rock 80s");
  });

  it("persists the duration returned by the download service", async () => {
    const track = new Track(makeTrack());
    trackRepository.findOne.mockResolvedValue(track);
    trackRepository.findOneWithPlaylist.mockResolvedValue(new Track(makeTrack()));
    youtubeDownloadService.downloadAndFormat.mockResolvedValue({ durationMs: 215000 });

    const persisted: (number | undefined)[] = [];
    trackRepository.updateStatusIf.mockImplementation(
      (_id, _expected, patch: { durationMs?: number }) => {
        persisted.push(patch.durationMs);
        return Promise.resolve(true);
      },
    );

    await useCase.execute(makeTrack());

    expect(persisted.at(-1)).toBe(215000);
  });

  it("does not pass a playlist name for album downloads", async () => {
    const track = new Track(makeTrack({ playlistId: "al-1" }));
    trackRepository.findOne.mockResolvedValue(track);
    trackRepository.findOneWithPlaylist.mockResolvedValue(new Track(makeTrack()));
    playlistRepository.findOne.mockResolvedValue({ type: "album", name: "Some Album" });

    await useCase.execute(makeTrack());

    expect(trackFileHelper.getFolderName).toHaveBeenCalledWith(expect.anything(), undefined);
  });

  // T2.3 — CAS guard: early return when markDownloadingIfNotAlready returns false
  describe("R2-S1 / R3-S1: idempotent guard via CAS claim", () => {
    beforeEach(() => {
      // Add markDownloadingIfNotAlready to the mock repository
      (
        trackRepository as unknown as Record<string, ReturnType<typeof vi.fn>>
      ).markDownloadingIfNotAlready = vi.fn();
    });

    it("returns early without writing Completed when CAS claim fails (track already Downloading)", async () => {
      const track = new Track(makeTrack());
      trackRepository.findOne.mockResolvedValue(track);
      (
        trackRepository as unknown as Record<string, ReturnType<typeof vi.fn>>
      ).markDownloadingIfNotAlready.mockResolvedValue(false);

      await useCase.execute(makeTrack());

      // No download attempted and no terminal status written
      expect(youtubeDownloadService.downloadAndFormat).not.toHaveBeenCalled();
      expect(trackRepository.update).not.toHaveBeenCalled();
    });

    it("returns early without enqueueing a second download when track is already Downloading", async () => {
      const track = new Track(makeTrack({ status: TrackStatusEnum.Downloading }));
      trackRepository.findOne.mockResolvedValue(track);
      (
        trackRepository as unknown as Record<string, ReturnType<typeof vi.fn>>
      ).markDownloadingIfNotAlready.mockResolvedValue(false);

      await useCase.execute(makeTrack({ status: TrackStatusEnum.Downloading }));

      expect(youtubeDownloadService.downloadAndFormat).not.toHaveBeenCalled();
    });

    it("uses updateStatusIf for the terminal write so a stale writer cannot clobber a newer state", async () => {
      const track = new Track(makeTrack());
      trackRepository.findOne.mockResolvedValue(track);
      trackRepository.findOneWithPlaylist.mockResolvedValue(new Track(makeTrack()));
      (
        trackRepository as unknown as Record<string, ReturnType<typeof vi.fn>>
      ).markDownloadingIfNotAlready.mockResolvedValue(true);
      (trackRepository as unknown as Record<string, ReturnType<typeof vi.fn>>).updateStatusIf = vi
        .fn()
        .mockResolvedValue(true);

      await useCase.execute(makeTrack());

      expect(
        (trackRepository as unknown as Record<string, ReturnType<typeof vi.fn>>).updateStatusIf,
      ).toHaveBeenCalledWith(
        "track-1",
        TrackStatusEnum.Downloading,
        expect.objectContaining({ status: TrackStatusEnum.Completed }),
      );
    });
  });
});
