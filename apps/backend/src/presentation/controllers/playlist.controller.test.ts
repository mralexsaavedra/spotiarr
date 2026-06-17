import type { Request, Response } from "express";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CreatePlaylistUseCase } from "@/application/use-cases/playlists/create-playlist.use-case";
import type { DeletePlaylistUseCase } from "@/application/use-cases/playlists/delete-playlist.use-case";
import type { GetMyPlaylistsUseCase } from "@/application/use-cases/playlists/get-my-playlists.use-case";
import type { GetPlaylistPreviewTracksPageUseCase } from "@/application/use-cases/playlists/get-playlist-preview-tracks-page.use-case";
import type { GetPlaylistPreviewUseCase } from "@/application/use-cases/playlists/get-playlist-preview.use-case";
import type { GetPlaylistsUseCase } from "@/application/use-cases/playlists/get-playlists.use-case";
import type { GetSystemStatusUseCase } from "@/application/use-cases/playlists/get-system-status.use-case";
import type { RetryPlaylistDownloadsUseCase } from "@/application/use-cases/playlists/retry-playlist-downloads.use-case";
import type { UpdatePlaylistUseCase } from "@/application/use-cases/playlists/update-playlist.use-case";
import { PlaylistController } from "./playlist.controller";

function makeRes(): Response {
  const json = vi.fn().mockReturnThis();
  const status = vi.fn().mockReturnThis();
  const send = vi.fn().mockReturnThis();
  return { json, status, send } as unknown as Response;
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    query: {},
    body: {},
    ...overrides,
  } as unknown as Request;
}

type Mocks = {
  createPlaylistUseCase: CreatePlaylistUseCase;
  deletePlaylistUseCase: DeletePlaylistUseCase;
  getMyPlaylistsUseCase: GetMyPlaylistsUseCase;
  getPlaylistPreviewUseCase: GetPlaylistPreviewUseCase;
  getPlaylistPreviewTracksPageUseCase: GetPlaylistPreviewTracksPageUseCase;
  getPlaylistsUseCase: GetPlaylistsUseCase;
  getSystemStatusUseCase: GetSystemStatusUseCase;
  retryPlaylistDownloadsUseCase: RetryPlaylistDownloadsUseCase;
  updatePlaylistUseCase: UpdatePlaylistUseCase;
};

function makeMocks(): Mocks {
  return {
    createPlaylistUseCase: {
      execute: vi.fn().mockResolvedValue({ id: "new-pl" }),
    } as unknown as CreatePlaylistUseCase,
    deletePlaylistUseCase: {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as DeletePlaylistUseCase,
    getMyPlaylistsUseCase: {
      execute: vi.fn().mockResolvedValue([]),
    } as unknown as GetMyPlaylistsUseCase,
    getPlaylistPreviewUseCase: {
      execute: vi.fn().mockResolvedValue({ name: "Preview" }),
    } as unknown as GetPlaylistPreviewUseCase,
    getPlaylistPreviewTracksPageUseCase: {
      execute: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    } as unknown as GetPlaylistPreviewTracksPageUseCase,
    getPlaylistsUseCase: {
      findAll: vi.fn().mockResolvedValue([]),
    } as unknown as GetPlaylistsUseCase,
    getSystemStatusUseCase: {
      execute: vi.fn().mockResolvedValue({ queued: 0 }),
    } as unknown as GetSystemStatusUseCase,
    retryPlaylistDownloadsUseCase: {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as RetryPlaylistDownloadsUseCase,
    updatePlaylistUseCase: {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as UpdatePlaylistUseCase,
  };
}

describe("PlaylistController", () => {
  let mocks: Mocks;
  let controller: PlaylistController;

  beforeEach(() => {
    mocks = makeMocks();
    controller = new PlaylistController(
      mocks.createPlaylistUseCase,
      mocks.deletePlaylistUseCase,
      mocks.getMyPlaylistsUseCase,
      mocks.getPlaylistPreviewUseCase,
      mocks.getPlaylistPreviewTracksPageUseCase,
      mocks.getPlaylistsUseCase,
      mocks.getSystemStatusUseCase,
      mocks.retryPlaylistDownloadsUseCase,
      mocks.updatePlaylistUseCase,
    );
  });

  describe("getPreview", () => {
    it("calls use case with url query param and responds with preview", async () => {
      const preview = { name: "My Playlist", tracks: [] };
      vi.mocked(mocks.getPlaylistPreviewUseCase.execute).mockResolvedValue(preview as never);

      const res = makeRes();
      await controller.getPreview(
        makeReq({ query: { url: "https://open.spotify.com/playlist/abc" } }),
        res,
      );

      expect(mocks.getPlaylistPreviewUseCase.execute).toHaveBeenCalledWith(
        "https://open.spotify.com/playlist/abc",
      );
      expect(res.json).toHaveBeenCalledWith(preview);
    });
  });

  describe("getPreviewTracks", () => {
    it("calls use case with url, parsed offset, and parsed limit", async () => {
      const page = { items: [{ id: "t1" }], total: 1 };
      vi.mocked(mocks.getPlaylistPreviewTracksPageUseCase.execute).mockResolvedValue(page as never);

      const res = makeRes();
      await controller.getPreviewTracks(
        makeReq({ query: { url: "https://spotify/pl/x", offset: "10", limit: "25" } }),
        res,
      );

      expect(mocks.getPlaylistPreviewTracksPageUseCase.execute).toHaveBeenCalledWith(
        "https://spotify/pl/x",
        10,
        25,
      );
      expect(res.json).toHaveBeenCalledWith(page);
    });

    it("defaults offset to 0 and limit to 100 when not provided", async () => {
      const res = makeRes();
      await controller.getPreviewTracks(makeReq({ query: { url: "https://spotify/pl/x" } }), res);

      expect(mocks.getPlaylistPreviewTracksPageUseCase.execute).toHaveBeenCalledWith(
        "https://spotify/pl/x",
        0,
        100,
      );
    });

    it("falls back to 0 and 100 when offset/limit are non-numeric", async () => {
      const res = makeRes();
      await controller.getPreviewTracks(
        makeReq({ query: { url: "https://spotify/pl/x", offset: "abc", limit: "xyz" } }),
        res,
      );

      expect(mocks.getPlaylistPreviewTracksPageUseCase.execute).toHaveBeenCalledWith(
        "https://spotify/pl/x",
        0,
        100,
      );
    });
  });

  describe("getMyPlaylists", () => {
    it("responds with playlists from use case", async () => {
      const playlists = [{ id: "p1" }, { id: "p2" }];
      vi.mocked(mocks.getMyPlaylistsUseCase.execute).mockResolvedValue(playlists as never);

      const res = makeRes();
      await controller.getMyPlaylists(makeReq(), res);

      expect(res.json).toHaveBeenCalledWith(playlists);
    });
  });

  describe("getDownloadStatus", () => {
    it("responds with system status from use case", async () => {
      const status = { queued: 3, active: 1 };
      vi.mocked(mocks.getSystemStatusUseCase.execute).mockResolvedValue(status as never);

      const res = makeRes();
      await controller.getDownloadStatus(makeReq(), res);

      expect(res.json).toHaveBeenCalledWith(status);
    });
  });

  describe("findAll", () => {
    it("responds with { data: playlists } from use case", async () => {
      const playlists = [{ id: "pl-1" }];
      vi.mocked(mocks.getPlaylistsUseCase.findAll).mockResolvedValue(playlists as never);

      const res = makeRes();
      await controller.findAll(makeReq(), res);

      expect(res.json).toHaveBeenCalledWith({ data: playlists });
    });
  });

  describe("create", () => {
    it("calls use case with req.body and responds 201 with created playlist", async () => {
      const body = { url: "https://spotify/pl/new", name: "New PL" };
      const created = { id: "created-id", ...body };
      vi.mocked(mocks.createPlaylistUseCase.execute).mockResolvedValue(created as never);

      const res = makeRes();
      await controller.create(makeReq({ body }), res);

      expect(mocks.createPlaylistUseCase.execute).toHaveBeenCalledWith(body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(created);
    });
  });

  describe("update", () => {
    it("calls use case with id param and body, responds 204", async () => {
      const res = makeRes();
      await controller.update(makeReq({ params: { id: "pl-42" }, body: { name: "Renamed" } }), res);

      expect(mocks.updatePlaylistUseCase.execute).toHaveBeenCalledWith("pl-42", {
        name: "Renamed",
      });
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("calls use case with id param and responds 204", async () => {
      const res = makeRes();
      await controller.remove(makeReq({ params: { id: "pl-99" } }), res);

      expect(mocks.deletePlaylistUseCase.execute).toHaveBeenCalledWith("pl-99");
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe("retryFailedOfPlaylist", () => {
    it("calls use case with id param and responds 204", async () => {
      const res = makeRes();
      await controller.retryFailedOfPlaylist(makeReq({ params: { id: "pl-7" } }), res);

      expect(mocks.retryPlaylistDownloadsUseCase.execute).toHaveBeenCalledWith("pl-7");
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });
});
