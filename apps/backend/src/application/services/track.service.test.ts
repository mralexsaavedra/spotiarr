import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { describe, expect, it, vi } from "vitest";
import type { CreateTrackUseCase } from "../use-cases/tracks/create-track.use-case";
import type { DeleteTrackUseCase } from "../use-cases/tracks/delete-track.use-case";
import type { DownloadTrackUseCase } from "../use-cases/tracks/download-track.use-case";
import type { GetTracksUseCase } from "../use-cases/tracks/get-tracks.use-case";
import type { RetryTrackDownloadUseCase } from "../use-cases/tracks/retry-track-download.use-case";
import type { SearchTrackOnYoutubeUseCase } from "../use-cases/tracks/search-track-on-youtube.use-case";
import type { UpdateTrackUseCase } from "../use-cases/tracks/update-track.use-case";
import { TrackService, type TrackServiceDependencies } from "./track.service";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_TRACK: ITrack = {
  id: "track-1",
  name: "Song A",
  artist: "Artist A",
  status: TrackStatusEnum.Completed,
  playlistId: "playlist-1",
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makeDeps(overrides: Partial<TrackServiceDependencies> = {}): TrackServiceDependencies {
  return {
    searchTrackOnYoutubeUseCase: {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as SearchTrackOnYoutubeUseCase,
    downloadTrackUseCase: {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as DownloadTrackUseCase,
    createTrackUseCase: {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as CreateTrackUseCase,
    deleteTrackUseCase: {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as DeleteTrackUseCase,
    getTracksUseCase: {
      getAll: vi.fn().mockResolvedValue([MOCK_TRACK]),
      getAllByPlaylist: vi.fn().mockResolvedValue([MOCK_TRACK]),
      get: vi.fn().mockResolvedValue(MOCK_TRACK),
      findStuckTracks: vi.fn().mockResolvedValue([MOCK_TRACK]),
    } as unknown as GetTracksUseCase,
    retryTrackDownloadUseCase: {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as RetryTrackDownloadUseCase,
    updateTrackUseCase: {
      execute: vi.fn().mockResolvedValue(undefined),
      executeIfStatus: vi.fn().mockResolvedValue(true),
    } as unknown as UpdateTrackUseCase,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TrackService.getAll", () => {
  it("delegates to getTracksUseCase.getAll and returns its result", async () => {
    const deps = makeDeps();
    const svc = new TrackService(deps);
    const result = await svc.getAll();
    expect(result).toEqual([MOCK_TRACK]);
    expect(deps.getTracksUseCase.getAll).toHaveBeenCalledWith(undefined);
  });

  it("passes the where filter through to the use case", async () => {
    const deps = makeDeps();
    const svc = new TrackService(deps);
    const where: Partial<ITrack> = { status: TrackStatusEnum.Error };
    await svc.getAll(where);
    expect(deps.getTracksUseCase.getAll).toHaveBeenCalledWith(where);
  });

  it("propagates use case rejection", async () => {
    const deps = makeDeps({
      getTracksUseCase: {
        getAll: vi.fn().mockRejectedValue(new Error("db error")),
        getAllByPlaylist: vi.fn(),
        get: vi.fn(),
        findStuckTracks: vi.fn(),
      } as unknown as GetTracksUseCase,
    });
    const svc = new TrackService(deps);
    await expect(svc.getAll()).rejects.toThrow("db error");
  });
});

describe("TrackService.getAllByPlaylist", () => {
  it("delegates to getTracksUseCase.getAllByPlaylist and returns its result", async () => {
    const deps = makeDeps();
    const svc = new TrackService(deps);
    const result = await svc.getAllByPlaylist("playlist-1");
    expect(result).toEqual([MOCK_TRACK]);
    expect(deps.getTracksUseCase.getAllByPlaylist).toHaveBeenCalledWith("playlist-1");
  });

  it("propagates use case rejection", async () => {
    const deps = makeDeps({
      getTracksUseCase: {
        getAll: vi.fn(),
        getAllByPlaylist: vi.fn().mockRejectedValue(new Error("playlist not found")),
        get: vi.fn(),
        findStuckTracks: vi.fn(),
      } as unknown as GetTracksUseCase,
    });
    const svc = new TrackService(deps);
    await expect(svc.getAllByPlaylist("missing")).rejects.toThrow("playlist not found");
  });
});

describe("TrackService.get", () => {
  it("delegates to getTracksUseCase.get and returns its result", async () => {
    const deps = makeDeps();
    const svc = new TrackService(deps);
    const result = await svc.get("track-1");
    expect(result).toEqual(MOCK_TRACK);
    expect(deps.getTracksUseCase.get).toHaveBeenCalledWith("track-1");
  });

  it("returns null when the use case returns null", async () => {
    const deps = makeDeps({
      getTracksUseCase: {
        getAll: vi.fn(),
        getAllByPlaylist: vi.fn(),
        get: vi.fn().mockResolvedValue(null),
        findStuckTracks: vi.fn(),
      } as unknown as GetTracksUseCase,
    });
    const svc = new TrackService(deps);
    expect(await svc.get("missing")).toBeNull();
  });

  it("propagates use case rejection", async () => {
    const deps = makeDeps({
      getTracksUseCase: {
        getAll: vi.fn(),
        getAllByPlaylist: vi.fn(),
        get: vi.fn().mockRejectedValue(new Error("track error")),
        findStuckTracks: vi.fn(),
      } as unknown as GetTracksUseCase,
    });
    const svc = new TrackService(deps);
    await expect(svc.get("x")).rejects.toThrow("track error");
  });
});

describe("TrackService.remove", () => {
  it("delegates to deleteTrackUseCase.execute with the given id", async () => {
    const deps = makeDeps();
    const svc = new TrackService(deps);
    await svc.remove("track-1");
    expect(deps.deleteTrackUseCase.execute).toHaveBeenCalledWith("track-1");
  });

  it("propagates use case rejection", async () => {
    const deps = makeDeps({
      deleteTrackUseCase: {
        execute: vi.fn().mockRejectedValue(new Error("delete failed")),
      } as unknown as DeleteTrackUseCase,
    });
    const svc = new TrackService(deps);
    await expect(svc.remove("x")).rejects.toThrow("delete failed");
  });
});

describe("TrackService.create", () => {
  it("delegates to createTrackUseCase.execute with the given track", async () => {
    const deps = makeDeps();
    const svc = new TrackService(deps);
    const track: Partial<ITrack> = { name: "New Track", artist: "Artist" };
    await svc.create(track);
    expect(deps.createTrackUseCase.execute).toHaveBeenCalledWith(track);
  });

  it("propagates use case rejection", async () => {
    const deps = makeDeps({
      createTrackUseCase: {
        execute: vi.fn().mockRejectedValue(new Error("create failed")),
      } as unknown as CreateTrackUseCase,
    });
    const svc = new TrackService(deps);
    await expect(svc.create({})).rejects.toThrow("create failed");
  });
});

describe("TrackService.update", () => {
  it("delegates to updateTrackUseCase.execute with id and patch", async () => {
    const deps = makeDeps();
    const svc = new TrackService(deps);
    const patch: Partial<ITrack> = { status: TrackStatusEnum.Completed };
    await svc.update("track-1", patch);
    expect(deps.updateTrackUseCase.execute).toHaveBeenCalledWith("track-1", patch);
  });

  it("propagates use case rejection", async () => {
    const deps = makeDeps({
      updateTrackUseCase: {
        execute: vi.fn().mockRejectedValue(new Error("update failed")),
        executeIfStatus: vi.fn(),
      } as unknown as UpdateTrackUseCase,
    });
    const svc = new TrackService(deps);
    await expect(svc.update("x", {})).rejects.toThrow("update failed");
  });
});

describe("TrackService.updateStatusIf", () => {
  it("delegates to updateTrackUseCase.executeIfStatus and returns true on match", async () => {
    const deps = makeDeps();
    const svc = new TrackService(deps);
    const patch: Partial<ITrack> = { status: TrackStatusEnum.Downloading };
    const result = await svc.updateStatusIf("track-1", TrackStatusEnum.New, patch);
    expect(result).toBe(true);
    expect(deps.updateTrackUseCase.executeIfStatus).toHaveBeenCalledWith(
      "track-1",
      TrackStatusEnum.New,
      patch,
    );
  });

  it("returns false when the status did not match", async () => {
    const deps = makeDeps({
      updateTrackUseCase: {
        execute: vi.fn(),
        executeIfStatus: vi.fn().mockResolvedValue(false),
      } as unknown as UpdateTrackUseCase,
    });
    const svc = new TrackService(deps);
    const result = await svc.updateStatusIf("track-1", TrackStatusEnum.Completed, {});
    expect(result).toBe(false);
  });

  it("propagates use case rejection", async () => {
    const deps = makeDeps({
      updateTrackUseCase: {
        execute: vi.fn(),
        executeIfStatus: vi.fn().mockRejectedValue(new Error("conditional update failed")),
      } as unknown as UpdateTrackUseCase,
    });
    const svc = new TrackService(deps);
    await expect(svc.updateStatusIf("x", TrackStatusEnum.New, {})).rejects.toThrow(
      "conditional update failed",
    );
  });
});

describe("TrackService.retry", () => {
  it("delegates to retryTrackDownloadUseCase.execute with the given id", async () => {
    const deps = makeDeps();
    const svc = new TrackService(deps);
    await svc.retry("track-1");
    expect(deps.retryTrackDownloadUseCase.execute).toHaveBeenCalledWith("track-1");
  });

  it("propagates use case rejection", async () => {
    const deps = makeDeps({
      retryTrackDownloadUseCase: {
        execute: vi.fn().mockRejectedValue(new Error("retry failed")),
      } as unknown as RetryTrackDownloadUseCase,
    });
    const svc = new TrackService(deps);
    await expect(svc.retry("x")).rejects.toThrow("retry failed");
  });
});

describe("TrackService.findOnYoutube", () => {
  it("delegates to searchTrackOnYoutubeUseCase.execute with the given track", async () => {
    const deps = makeDeps();
    const svc = new TrackService(deps);
    await svc.findOnYoutube(MOCK_TRACK);
    expect(deps.searchTrackOnYoutubeUseCase.execute).toHaveBeenCalledWith(MOCK_TRACK);
  });

  it("propagates use case rejection", async () => {
    const deps = makeDeps({
      searchTrackOnYoutubeUseCase: {
        execute: vi.fn().mockRejectedValue(new Error("youtube error")),
      } as unknown as SearchTrackOnYoutubeUseCase,
    });
    const svc = new TrackService(deps);
    await expect(svc.findOnYoutube(MOCK_TRACK)).rejects.toThrow("youtube error");
  });
});

describe("TrackService.downloadFromYoutube", () => {
  it("delegates to downloadTrackUseCase.execute with the given track", async () => {
    const deps = makeDeps();
    const svc = new TrackService(deps);
    await svc.downloadFromYoutube(MOCK_TRACK);
    expect(deps.downloadTrackUseCase.execute).toHaveBeenCalledWith(MOCK_TRACK);
  });

  it("propagates use case rejection", async () => {
    const deps = makeDeps({
      downloadTrackUseCase: {
        execute: vi.fn().mockRejectedValue(new Error("download failed")),
      } as unknown as DownloadTrackUseCase,
    });
    const svc = new TrackService(deps);
    await expect(svc.downloadFromYoutube(MOCK_TRACK)).rejects.toThrow("download failed");
  });
});

describe("TrackService.findStuckTracks", () => {
  it("delegates to getTracksUseCase.findStuckTracks and returns its result", async () => {
    const deps = makeDeps();
    const svc = new TrackService(deps);
    const statuses = [TrackStatusEnum.Downloading, TrackStatusEnum.Searching];
    const result = await svc.findStuckTracks(statuses, 1000);
    expect(result).toEqual([MOCK_TRACK]);
    expect(deps.getTracksUseCase.findStuckTracks).toHaveBeenCalledWith(statuses, 1000);
  });

  it("returns an empty array when no stuck tracks are found", async () => {
    const deps = makeDeps({
      getTracksUseCase: {
        getAll: vi.fn(),
        getAllByPlaylist: vi.fn(),
        get: vi.fn(),
        findStuckTracks: vi.fn().mockResolvedValue([]),
      } as unknown as GetTracksUseCase,
    });
    const svc = new TrackService(deps);
    expect(await svc.findStuckTracks([TrackStatusEnum.Downloading], 1000)).toEqual([]);
  });

  it("propagates use case rejection", async () => {
    const deps = makeDeps({
      getTracksUseCase: {
        getAll: vi.fn(),
        getAllByPlaylist: vi.fn(),
        get: vi.fn(),
        findStuckTracks: vi.fn().mockRejectedValue(new Error("stuck query failed")),
      } as unknown as GetTracksUseCase,
    });
    const svc = new TrackService(deps);
    await expect(svc.findStuckTracks([TrackStatusEnum.Downloading], 1000)).rejects.toThrow(
      "stuck query failed",
    );
  });
});
