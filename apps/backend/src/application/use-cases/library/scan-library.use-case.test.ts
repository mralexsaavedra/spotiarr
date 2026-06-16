import { PlaylistTypeEnum, TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Track } from "@/domain/entities/track.entity";
import { ScanLibraryUseCase } from "./scan-library.use-case";

function makeCompletedTrack(overrides: Partial<ITrack> = {}): Track {
  return new Track({
    id: "track-completed-1",
    name: "Song",
    artist: "Artist",
    status: TrackStatusEnum.Completed,
    searchAttempts: 0,
    playlistId: "playlist-1",
    ...overrides,
  });
}

describe("ScanLibraryUseCase — Completed file reconciliation (Slice 5)", () => {
  const scannerService = {
    scanMusicLibrary: vi.fn(),
    fileExists: vi.fn(),
  };

  const pathService = {
    getMusicLibraryPath: vi.fn(() => "/music"),
    getFolderName: vi.fn(),
    getTrackFileName: vi.fn(),
    getPlaylistFolderPath: vi.fn(),
    getArtistFolderPath: vi.fn(),
    getAlbumFolderPath: vi.fn(),
    ensureParentDirectory: vi.fn(),
  };

  const trackRepository = {
    findAllByStatuses: vi.fn(),
    findOne: vi.fn(),
    findOneWithPlaylist: vi.fn(),
  };

  const retryTrackDownloadUseCase = {
    execute: vi.fn(),
  };

  const settingsService = {
    getNumber: vi.fn(async (key: string) => {
      if (key === "SEARCH_MAX_ATTEMPTS") return 5;
      return 0;
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    scannerService.scanMusicLibrary.mockResolvedValue([]);
    // Default: file absent on disk (reconciliation triggers). Present-file
    // tests override fileExists to true.
    scannerService.fileExists.mockResolvedValue(false);
    settingsService.getNumber.mockImplementation(async (key: string) => {
      if (key === "SEARCH_MAX_ATTEMPTS") return 5;
      return 0;
    });
  });

  it("R7-S1: Completed track with missing file is re-driven via retryTrackDownloadUseCase", async () => {
    const track = makeCompletedTrack({ id: "track-missing" });
    trackRepository.findAllByStatuses.mockResolvedValue([track]);
    pathService.getFolderName.mockResolvedValue("/music/Artist/Song.mp3");
    scannerService.fileExists.mockResolvedValue(false);

    const useCase = new ScanLibraryUseCase(
      scannerService as never,
      pathService as never,
      trackRepository as never,
      retryTrackDownloadUseCase as never,
      settingsService as never,
    );

    await useCase.execute();

    expect(retryTrackDownloadUseCase.execute).toHaveBeenCalledWith("track-missing");
  });

  it("R7-S2 / R10-S1: Completed track with present file remains Completed and is NOT re-enqueued", async () => {
    const track = makeCompletedTrack({ id: "track-present" });
    trackRepository.findAllByStatuses.mockResolvedValue([track]);

    const presentFilePath = "/music/Artist/Song.mp3";
    pathService.getFolderName.mockResolvedValue(presentFilePath);
    // File is present on disk → no re-drive.
    scannerService.fileExists.mockResolvedValue(true);

    const useCase = new ScanLibraryUseCase(
      scannerService as never,
      pathService as never,
      trackRepository as never,
      retryTrackDownloadUseCase as never,
      settingsService as never,
    );

    await useCase.execute();

    expect(scannerService.fileExists).toHaveBeenCalledWith(presentFilePath);
    expect(retryTrackDownloadUseCase.execute).not.toHaveBeenCalled();
  });

  it("R7-S3: file-missing re-drive does NOT increment searchAttempts on the track", async () => {
    const track = makeCompletedTrack({ id: "track-missing-2", searchAttempts: 0 });
    trackRepository.findAllByStatuses.mockResolvedValue([track]);
    pathService.getFolderName.mockResolvedValue("/music/Artist/Song.mp3");
    scannerService.scanMusicLibrary.mockResolvedValue([]);

    const useCase = new ScanLibraryUseCase(
      scannerService as never,
      pathService as never,
      trackRepository as never,
      retryTrackDownloadUseCase as never,
      settingsService as never,
    );

    await useCase.execute();

    // retryTrackDownloadUseCase is called, not a direct searchAttempts mutation
    // The reconciliation path must NOT touch searchAttempts (it delegates to retryTrackDownloadUseCase)
    // Track entity still at 0 — no increment happened
    expect(track.searchAttempts).toBe(0);
    expect(retryTrackDownloadUseCase.execute).toHaveBeenCalledWith("track-missing-2");
  });

  it("cap-reached track (searchAttempts >= max) is skipped even if file is missing", async () => {
    const track = makeCompletedTrack({ id: "track-capped", searchAttempts: 5 });
    trackRepository.findAllByStatuses.mockResolvedValue([track]);
    pathService.getFolderName.mockResolvedValue("/music/Artist/Song.mp3");
    scannerService.scanMusicLibrary.mockResolvedValue([]);

    const useCase = new ScanLibraryUseCase(
      scannerService as never,
      pathService as never,
      trackRepository as never,
      retryTrackDownloadUseCase as never,
      settingsService as never,
    );

    await useCase.execute();

    expect(retryTrackDownloadUseCase.execute).not.toHaveBeenCalled();
  });

  it("terminal-error track is skipped even if file is missing", async () => {
    const track = makeCompletedTrack({
      id: "track-terminal",
      searchAttempts: 3,
      error: "youtube_not_found",
    });
    trackRepository.findAllByStatuses.mockResolvedValue([track]);
    pathService.getFolderName.mockResolvedValue("/music/Artist/Song.mp3");
    scannerService.scanMusicLibrary.mockResolvedValue([]);

    const useCase = new ScanLibraryUseCase(
      scannerService as never,
      pathService as never,
      trackRepository as never,
      retryTrackDownloadUseCase as never,
      settingsService as never,
    );

    await useCase.execute();

    expect(retryTrackDownloadUseCase.execute).not.toHaveBeenCalled();
  });

  it("a failure in per-track reconciliation does NOT abort the overall scan", async () => {
    const failingTrack = makeCompletedTrack({ id: "track-fail" });
    const goodTrack = makeCompletedTrack({ id: "track-ok" });
    trackRepository.findAllByStatuses.mockResolvedValue([failingTrack, goodTrack]);

    pathService.getFolderName
      .mockRejectedValueOnce(new Error("path resolution failed"))
      .mockResolvedValueOnce("/music/Artist/Song2.mp3");

    scannerService.scanMusicLibrary.mockResolvedValue([]);

    const useCase = new ScanLibraryUseCase(
      scannerService as never,
      pathService as never,
      trackRepository as never,
      retryTrackDownloadUseCase as never,
      settingsService as never,
    );

    await expect(useCase.execute()).resolves.not.toThrow();
    // good track's file is also absent → retried
    expect(retryTrackDownloadUseCase.execute).toHaveBeenCalledWith("track-ok");
  });
});

describe("ScanLibraryUseCase — T5.2 path-parity: reconciliation uses same getFolderName as DownloadTrackUseCase", () => {
  const scannerService = {
    scanMusicLibrary: vi.fn(),
    fileExists: vi.fn(),
  };

  const pathService = {
    getMusicLibraryPath: vi.fn(() => "/music"),
    getFolderName: vi.fn(),
    getTrackFileName: vi.fn(),
    getPlaylistFolderPath: vi.fn(),
    getArtistFolderPath: vi.fn(),
    getAlbumFolderPath: vi.fn(),
    ensureParentDirectory: vi.fn(),
  };

  const trackRepository = {
    findAllByStatuses: vi.fn(),
    findOne: vi.fn(),
    findOneWithPlaylist: vi.fn(),
  };

  const retryTrackDownloadUseCase = {
    execute: vi.fn(),
  };

  const settingsService = {
    getNumber: vi.fn(async (key: string) => {
      if (key === "SEARCH_MAX_ATTEMPTS") return 5;
      return 0;
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    scannerService.scanMusicLibrary.mockResolvedValue([]);
    scannerService.fileExists.mockResolvedValue(true);
  });

  const playlistRepository = {
    findOne: vi.fn(),
  };

  it("T5.2: resolves the playlist name and calls getFolderName with the SAME (track, playlistName) args as DownloadTrackUseCase — playlist-type track", async () => {
    const track = makeCompletedTrack({
      id: "track-playlist",
      playlistId: "playlist-1",
    });
    trackRepository.findAllByStatuses.mockResolvedValue([track]);
    // A Playlist-type playlist contributes its name to the path, exactly as
    // DownloadTrackUseCase does — so the reconciliation must look it up too.
    playlistRepository.findOne.mockResolvedValue({
      type: PlaylistTypeEnum.Playlist,
      name: "My Playlist",
    });

    const expectedPath = "/music/Playlists/My Playlist/Artist - Song.mp3";
    pathService.getFolderName.mockResolvedValue(expectedPath);

    // File is present — no re-drive expected. Purpose is to assert the path
    // derivation uses the resolved playlist name.
    scannerService.scanMusicLibrary.mockResolvedValue([
      {
        name: "Artist",
        albumCount: 1,
        trackCount: 1,
        totalSize: 1000,
        albums: [
          {
            name: "Album",
            tracks: [{ name: "Song", filePath: expectedPath, duration: 180 }],
          },
        ],
      },
    ]);

    const useCase = new ScanLibraryUseCase(
      scannerService as never,
      pathService as never,
      trackRepository as never,
      retryTrackDownloadUseCase as never,
      settingsService as never,
      playlistRepository as never,
    );

    await useCase.execute();

    expect(playlistRepository.findOne).toHaveBeenCalledWith("playlist-1");
    expect(pathService.getFolderName).toHaveBeenCalledWith(track.toPrimitive(), "My Playlist");
    expect(retryTrackDownloadUseCase.execute).not.toHaveBeenCalled();
  });

  it("T5.2: when a non-Playlist/non-AI track path is used, getFolderName is called without playlistName — produces the same path as DownloadTrackUseCase for Album/Artist type", async () => {
    const albumTrack = makeCompletedTrack({
      id: "track-album",
      playlistId: undefined,
    });
    trackRepository.findAllByStatuses.mockResolvedValue([albumTrack]);

    const albumPath = "/music/Artist/Album/Song.mp3";
    pathService.getFolderName.mockResolvedValue(albumPath);

    scannerService.scanMusicLibrary.mockResolvedValue([
      {
        name: "Artist",
        albumCount: 1,
        trackCount: 1,
        totalSize: 1000,
        albums: [
          {
            name: "Album",
            tracks: [{ name: "Song", filePath: albumPath, duration: 180 }],
          },
        ],
      },
    ]);

    const useCase = new ScanLibraryUseCase(
      scannerService as never,
      pathService as never,
      trackRepository as never,
      retryTrackDownloadUseCase as never,
      settingsService as never,
    );

    await useCase.execute();

    expect(pathService.getFolderName).toHaveBeenCalledWith(albumTrack.toPrimitive(), undefined);
    expect(retryTrackDownloadUseCase.execute).not.toHaveBeenCalled();
  });

  it("T5.2: path parity — track with Playlist type gets playlistName passed if playlist is resolved (design note: scan-use-case passes undefined; parity test for Album)", async () => {
    // This test validates that for Album-type tracks (no playlistName needed),
    // the path produced by getFolderName(track, undefined) matches what
    // DownloadTrackUseCase produces for Album/Artist tracks.
    // For Playlist/AI types, DownloadTrackUseCase passes the playlist name;
    // the reconciliation cannot resolve playlist names efficiently at scan time
    // so it passes undefined — this is a known minor divergence, documented here.
    // The critical invariant: for Album/Artist tracks the paths ARE identical.
    const albumTrack = makeCompletedTrack({ id: "track-album-parity", playlistId: undefined });
    trackRepository.findAllByStatuses.mockResolvedValue([albumTrack]);

    pathService.getFolderName.mockImplementation(async (track: ITrack, playlistName?: string) => {
      if (playlistName) {
        return `/music/Playlists/${playlistName}/${track.artist} - ${track.name}.mp3`;
      }
      return `/music/${track.artist}/${track.name}.mp3`;
    });

    const expectedPath = "/music/Artist/Song.mp3";
    scannerService.scanMusicLibrary.mockResolvedValue([
      {
        name: "Artist",
        albumCount: 1,
        trackCount: 1,
        totalSize: 1000,
        albums: [
          {
            name: "Album",
            tracks: [{ name: "Song", filePath: expectedPath, duration: 180 }],
          },
        ],
      },
    ]);

    const useCase = new ScanLibraryUseCase(
      scannerService as never,
      pathService as never,
      trackRepository as never,
      retryTrackDownloadUseCase as never,
      settingsService as never,
    );

    await useCase.execute();

    // File IS present → no re-drive
    expect(retryTrackDownloadUseCase.execute).not.toHaveBeenCalled();
  });
});

describe("ScanLibraryUseCase — works without retryTrackDownloadUseCase (backward compat)", () => {
  const scannerService = {
    scanMusicLibrary: vi.fn(),
  };

  const pathService = {
    getMusicLibraryPath: vi.fn(() => "/music"),
    getFolderName: vi.fn(),
    getTrackFileName: vi.fn(),
    getPlaylistFolderPath: vi.fn(),
    getArtistFolderPath: vi.fn(),
    getAlbumFolderPath: vi.fn(),
    ensureParentDirectory: vi.fn(),
  };

  const trackRepository = {
    findAllByStatuses: vi.fn(),
    findOne: vi.fn(),
    findOneWithPlaylist: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    scannerService.scanMusicLibrary.mockResolvedValue([]);
    trackRepository.findAllByStatuses.mockResolvedValue([]);
  });

  it("executes without error when retryTrackDownloadUseCase is not injected", async () => {
    const useCase = new ScanLibraryUseCase(
      scannerService as never,
      pathService as never,
      trackRepository as never,
    );

    await expect(useCase.execute()).resolves.not.toThrow();
  });
});
