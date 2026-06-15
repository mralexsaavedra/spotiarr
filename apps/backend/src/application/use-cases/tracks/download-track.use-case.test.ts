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
    };
    youtubeDownloadService = { downloadAndFormat: vi.fn().mockResolvedValue(undefined) };
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

    // The same entity instance is mutated in place, so snapshot the status at
    // each persist call instead of reading the shared reference afterwards.
    const persistedStatuses: (string | undefined)[] = [];
    trackRepository.update.mockImplementation((_id, entity: Track) => {
      persistedStatuses.push(entity.status);
      return Promise.resolve(undefined);
    });

    await useCase.execute(makeTrack());

    expect(persistedStatuses).toEqual([TrackStatusEnum.Downloading, TrackStatusEnum.Completed]);
  });

  it("writes history and updates the M3U only after the track is marked completed", async () => {
    const track = new Track(makeTrack());
    trackRepository.findOne.mockResolvedValue(track);
    trackRepository.findOneWithPlaylist.mockResolvedValue(new Track(makeTrack()));

    await useCase.execute(makeTrack());

    // Final DB persist (Completed) must happen before M3U generation.
    const completedUpdateOrder = trackRepository.update.mock.invocationCallOrder[1];
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
    trackRepository.update.mockImplementation((_id, entity: Track) => {
      const { status, error } = entity.toPrimitive();
      persisted.push({ status, error });
      return Promise.resolve(undefined);
    });

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

  it("does not pass a playlist name for album downloads", async () => {
    const track = new Track(makeTrack({ playlistId: "al-1" }));
    trackRepository.findOne.mockResolvedValue(track);
    trackRepository.findOneWithPlaylist.mockResolvedValue(new Track(makeTrack()));
    playlistRepository.findOne.mockResolvedValue({ type: "album", name: "Some Album" });

    await useCase.execute(makeTrack());

    expect(trackFileHelper.getFolderName).toHaveBeenCalledWith(expect.anything(), undefined);
  });
});
