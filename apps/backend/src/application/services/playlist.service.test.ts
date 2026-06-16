import {
  type IPlaylist,
  type PlaylistPreview,
  type SpotifyPlaylist,
  PlaylistTypeEnum,
  PlaylistStatusEnum,
  TrackStatusEnum,
  type DownloadStatusResponse,
} from "@spotiarr/shared";
import { describe, expect, it, vi } from "vitest";
import type { CreatePlaylistUseCase } from "../use-cases/playlists/create-playlist.use-case";
import type { DeletePlaylistUseCase } from "../use-cases/playlists/delete-playlist.use-case";
import type { GetMyPlaylistsUseCase } from "../use-cases/playlists/get-my-playlists.use-case";
import type { GetPlaylistPreviewUseCase } from "../use-cases/playlists/get-playlist-preview.use-case";
import type { GetPlaylistsUseCase } from "../use-cases/playlists/get-playlists.use-case";
import type { GetSystemStatusUseCase } from "../use-cases/playlists/get-system-status.use-case";
import type { RetryPlaylistDownloadsUseCase } from "../use-cases/playlists/retry-playlist-downloads.use-case";
import type { SyncSubscribedPlaylistsUseCase } from "../use-cases/playlists/sync-subscribed-playlists.use-case";
import type { UpdatePlaylistUseCase } from "../use-cases/playlists/update-playlist.use-case";
import { PlaylistService, type PlaylistServiceDependencies } from "./playlist.service";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_PLAYLIST: IPlaylist = {
  id: "playlist-1",
  name: "My Playlist",
  type: PlaylistTypeEnum.Playlist,
  spotifyUrl: "https://open.spotify.com/playlist/1",
  subscribed: false,
};

const MOCK_PREVIEW: PlaylistPreview = {
  name: "Preview Playlist",
  type: "playlist",
  description: null,
  coverUrl: null,
  totalTracks: 5,
  tracks: [],
};

const MOCK_STATUS: DownloadStatusResponse = {
  playlistStatusMap: { "playlist-1": PlaylistStatusEnum.Completed },
  trackStatusMap: { "track-1": TrackStatusEnum.Completed },
  albumTrackCountMap: {},
};

const MOCK_SPOTIFY_PLAYLISTS: SpotifyPlaylist[] = [
  {
    id: "sp-1",
    name: "Spotify Playlist",
    image: null,
    owner: "user",
    tracks: 10,
    spotifyUrl: "https://open.spotify.com/playlist/sp-1",
  },
];

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makeDeps(
  overrides: Partial<PlaylistServiceDependencies> = {},
): PlaylistServiceDependencies {
  return {
    createPlaylistUseCase: {
      execute: vi.fn().mockResolvedValue(MOCK_PLAYLIST),
    } as unknown as CreatePlaylistUseCase,
    getSystemStatusUseCase: {
      execute: vi.fn().mockResolvedValue(MOCK_STATUS),
    } as unknown as GetSystemStatusUseCase,
    getPlaylistPreviewUseCase: {
      execute: vi.fn().mockResolvedValue(MOCK_PREVIEW),
    } as unknown as GetPlaylistPreviewUseCase,
    syncSubscribedPlaylistsUseCase: {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as SyncSubscribedPlaylistsUseCase,
    getPlaylistsUseCase: {
      findAll: vi.fn().mockResolvedValue([MOCK_PLAYLIST]),
      findOne: vi.fn().mockResolvedValue(MOCK_PLAYLIST),
    } as unknown as GetPlaylistsUseCase,
    deletePlaylistUseCase: {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as DeletePlaylistUseCase,
    updatePlaylistUseCase: {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as UpdatePlaylistUseCase,
    retryPlaylistDownloadsUseCase: {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as RetryPlaylistDownloadsUseCase,
    getMyPlaylistsUseCase: {
      execute: vi.fn().mockResolvedValue(MOCK_SPOTIFY_PLAYLISTS),
    } as unknown as GetMyPlaylistsUseCase,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PlaylistService.findAll", () => {
  it("delegates to getPlaylistsUseCase.findAll and returns its result", async () => {
    const deps = makeDeps();
    const svc = new PlaylistService(deps);
    const result = await svc.findAll();
    expect(result).toEqual([MOCK_PLAYLIST]);
    expect(deps.getPlaylistsUseCase.findAll).toHaveBeenCalledWith(true, undefined);
  });

  it("passes includesTracks=false and where filter through to the use case", async () => {
    const deps = makeDeps();
    const svc = new PlaylistService(deps);
    const where: Partial<IPlaylist> = { subscribed: true };
    await svc.findAll(false, where);
    expect(deps.getPlaylistsUseCase.findAll).toHaveBeenCalledWith(false, where);
  });

  it("propagates use case rejection", async () => {
    const deps = makeDeps({
      getPlaylistsUseCase: {
        findAll: vi.fn().mockRejectedValue(new Error("db error")),
        findOne: vi.fn(),
      } as unknown as GetPlaylistsUseCase,
    });
    const svc = new PlaylistService(deps);
    await expect(svc.findAll()).rejects.toThrow("db error");
  });
});

describe("PlaylistService.findOne", () => {
  it("delegates to getPlaylistsUseCase.findOne and returns its result", async () => {
    const deps = makeDeps();
    const svc = new PlaylistService(deps);
    const result = await svc.findOne("playlist-1");
    expect(result).toEqual(MOCK_PLAYLIST);
    expect(deps.getPlaylistsUseCase.findOne).toHaveBeenCalledWith("playlist-1");
  });

  it("returns null when the use case returns null", async () => {
    const deps = makeDeps({
      getPlaylistsUseCase: {
        findAll: vi.fn(),
        findOne: vi.fn().mockResolvedValue(null),
      } as unknown as GetPlaylistsUseCase,
    });
    const svc = new PlaylistService(deps);
    expect(await svc.findOne("missing")).toBeNull();
  });

  it("propagates use case rejection", async () => {
    const deps = makeDeps({
      getPlaylistsUseCase: {
        findAll: vi.fn(),
        findOne: vi.fn().mockRejectedValue(new Error("not found")),
      } as unknown as GetPlaylistsUseCase,
    });
    const svc = new PlaylistService(deps);
    await expect(svc.findOne("x")).rejects.toThrow("not found");
  });
});

describe("PlaylistService.remove", () => {
  it("delegates to deletePlaylistUseCase.execute with the given id", async () => {
    const deps = makeDeps();
    const svc = new PlaylistService(deps);
    await svc.remove("playlist-1");
    expect(deps.deletePlaylistUseCase.execute).toHaveBeenCalledWith("playlist-1");
  });

  it("propagates use case rejection", async () => {
    const deps = makeDeps({
      deletePlaylistUseCase: {
        execute: vi.fn().mockRejectedValue(new Error("delete failed")),
      } as unknown as DeletePlaylistUseCase,
    });
    const svc = new PlaylistService(deps);
    await expect(svc.remove("x")).rejects.toThrow("delete failed");
  });
});

describe("PlaylistService.create", () => {
  it("delegates to createPlaylistUseCase.execute and returns the new playlist", async () => {
    const deps = makeDeps();
    const svc = new PlaylistService(deps);
    const input = {
      kind: "spotifyUrl" as const,
      spotifyUrl: "https://open.spotify.com/playlist/1",
    };
    const result = await svc.create(input);
    expect(result).toEqual(MOCK_PLAYLIST);
    expect(deps.createPlaylistUseCase.execute).toHaveBeenCalledWith(input);
  });

  it("propagates use case rejection", async () => {
    const deps = makeDeps({
      createPlaylistUseCase: {
        execute: vi.fn().mockRejectedValue(new Error("already exists")),
      } as unknown as CreatePlaylistUseCase,
    });
    const svc = new PlaylistService(deps);
    await expect(svc.create({ kind: "spotifyUrl", spotifyUrl: "" })).rejects.toThrow(
      "already exists",
    );
  });
});

describe("PlaylistService.update", () => {
  it("delegates to updatePlaylistUseCase.execute with id and patch", async () => {
    const deps = makeDeps();
    const svc = new PlaylistService(deps);
    const patch: Partial<IPlaylist> = { name: "New Name" };
    await svc.update("playlist-1", patch);
    expect(deps.updatePlaylistUseCase.execute).toHaveBeenCalledWith("playlist-1", patch);
  });

  it("propagates use case rejection", async () => {
    const deps = makeDeps({
      updatePlaylistUseCase: {
        execute: vi.fn().mockRejectedValue(new Error("update failed")),
      } as unknown as UpdatePlaylistUseCase,
    });
    const svc = new PlaylistService(deps);
    await expect(svc.update("x", {})).rejects.toThrow("update failed");
  });
});

describe("PlaylistService.retryFailedOfPlaylist", () => {
  it("delegates to retryPlaylistDownloadsUseCase.execute with the given id", async () => {
    const deps = makeDeps();
    const svc = new PlaylistService(deps);
    await svc.retryFailedOfPlaylist("playlist-1");
    expect(deps.retryPlaylistDownloadsUseCase.execute).toHaveBeenCalledWith("playlist-1");
  });

  it("propagates use case rejection", async () => {
    const deps = makeDeps({
      retryPlaylistDownloadsUseCase: {
        execute: vi.fn().mockRejectedValue(new Error("retry failed")),
      } as unknown as RetryPlaylistDownloadsUseCase,
    });
    const svc = new PlaylistService(deps);
    await expect(svc.retryFailedOfPlaylist("x")).rejects.toThrow("retry failed");
  });
});

describe("PlaylistService.checkSubscribedPlaylists", () => {
  it("delegates to syncSubscribedPlaylistsUseCase.execute", async () => {
    const deps = makeDeps();
    const svc = new PlaylistService(deps);
    await svc.checkSubscribedPlaylists();
    expect(deps.syncSubscribedPlaylistsUseCase.execute).toHaveBeenCalledOnce();
  });

  it("propagates use case rejection", async () => {
    const deps = makeDeps({
      syncSubscribedPlaylistsUseCase: {
        execute: vi.fn().mockRejectedValue(new Error("sync failed")),
      } as unknown as SyncSubscribedPlaylistsUseCase,
    });
    const svc = new PlaylistService(deps);
    await expect(svc.checkSubscribedPlaylists()).rejects.toThrow("sync failed");
  });
});

describe("PlaylistService.getPreview", () => {
  it("delegates to getPlaylistPreviewUseCase.execute and returns the preview", async () => {
    const deps = makeDeps();
    const svc = new PlaylistService(deps);
    const result = await svc.getPreview("https://open.spotify.com/playlist/1");
    expect(result).toEqual(MOCK_PREVIEW);
    expect(deps.getPlaylistPreviewUseCase.execute).toHaveBeenCalledWith(
      "https://open.spotify.com/playlist/1",
    );
  });

  it("propagates use case rejection", async () => {
    const deps = makeDeps({
      getPlaylistPreviewUseCase: {
        execute: vi.fn().mockRejectedValue(new Error("not accessible")),
      } as unknown as GetPlaylistPreviewUseCase,
    });
    const svc = new PlaylistService(deps);
    await expect(svc.getPreview("x")).rejects.toThrow("not accessible");
  });
});

describe("PlaylistService.getDownloadStatus", () => {
  it("delegates to getSystemStatusUseCase.execute and returns the status", async () => {
    const deps = makeDeps();
    const svc = new PlaylistService(deps);
    const result = await svc.getDownloadStatus();
    expect(result).toEqual(MOCK_STATUS);
    expect(deps.getSystemStatusUseCase.execute).toHaveBeenCalledOnce();
  });

  it("propagates use case rejection", async () => {
    const deps = makeDeps({
      getSystemStatusUseCase: {
        execute: vi.fn().mockRejectedValue(new Error("status error")),
      } as unknown as GetSystemStatusUseCase,
    });
    const svc = new PlaylistService(deps);
    await expect(svc.getDownloadStatus()).rejects.toThrow("status error");
  });
});

describe("PlaylistService.getMyPlaylists", () => {
  it("delegates to getMyPlaylistsUseCase.execute and returns the list", async () => {
    const deps = makeDeps();
    const svc = new PlaylistService(deps);
    const result = await svc.getMyPlaylists();
    expect(result).toEqual(MOCK_SPOTIFY_PLAYLISTS);
    expect(deps.getMyPlaylistsUseCase.execute).toHaveBeenCalledOnce();
  });

  it("propagates use case rejection", async () => {
    const deps = makeDeps({
      getMyPlaylistsUseCase: {
        execute: vi.fn().mockRejectedValue(new Error("spotify error")),
      } as unknown as GetMyPlaylistsUseCase,
    });
    const svc = new PlaylistService(deps);
    await expect(svc.getMyPlaylists()).rejects.toThrow("spotify error");
  });
});
