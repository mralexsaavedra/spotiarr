import type { Request, Response } from "express";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HistoryUseCases } from "@/application/use-cases/history/history.use-cases";
import { HistoryController } from "./history.controller";

function mockRes(): Response {
  return { json: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as Response;
}

function mockReq(body: unknown = {}, query: Record<string, string> = {}): Request {
  return { body, query } as unknown as Request;
}

function makeUseCases(downloads: unknown[] = [], tracks: unknown[] = []): HistoryUseCases {
  return {
    getRecentDownloads: vi.fn().mockResolvedValue(downloads),
    getRecentTracks: vi.fn().mockResolvedValue(tracks),
    recordPlay: vi.fn().mockResolvedValue(undefined),
    getTopTracks: vi.fn().mockResolvedValue([]),
    getTopArtists: vi.fn().mockResolvedValue([]),
    getRecentPlays: vi.fn().mockResolvedValue([]),
  } as unknown as HistoryUseCases;
}

describe("HistoryController", () => {
  let useCases: HistoryUseCases;
  let controller: HistoryController;

  beforeEach(() => {
    useCases = makeUseCases();
    controller = new HistoryController(useCases);
  });

  describe("getRecentDownloads", () => {
    it("responds with { data: items } from use case", async () => {
      const items = [{ id: "1", name: "Song A" }];
      vi.mocked(useCases.getRecentDownloads).mockResolvedValue(items as never);

      const res = mockRes();
      await controller.getRecentDownloads(mockReq(), res);

      expect(useCases.getRecentDownloads).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({ data: items });
    });

    it("responds with { data: [] } when use case returns empty array", async () => {
      const res = mockRes();
      await controller.getRecentDownloads(mockReq(), res);

      expect(res.json).toHaveBeenCalledWith({ data: [] });
    });
  });

  describe("getRecentTracks", () => {
    it("responds with { data: items } from use case", async () => {
      const items = [
        { id: "t1", title: "Track 1" },
        { id: "t2", title: "Track 2" },
      ];
      vi.mocked(useCases.getRecentTracks).mockResolvedValue(items as never);

      const res = mockRes();
      await controller.getRecentTracks(mockReq(), res);

      expect(useCases.getRecentTracks).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({ data: items });
    });

    it("responds with { data: [] } when use case returns empty array", async () => {
      const res = mockRes();
      await controller.getRecentTracks(mockReq(), res);

      expect(res.json).toHaveBeenCalledWith({ data: [] });
    });
  });

  describe("recordPlay", () => {
    const playBody = {
      trackId: "t-1",
      trackUrl: null,
      trackName: "Song",
      artist: "Artist",
      album: null,
      albumCoverUrl: null,
      durationMs: null,
      playedAt: 1_700_000_000_000,
    };

    it("responds with 201 and calls recordPlay use case", async () => {
      const res = mockRes();
      await controller.recordPlay(mockReq(playBody) as never, res);

      expect(useCases.recordPlay).toHaveBeenCalledOnce();
      expect(useCases.recordPlay).toHaveBeenCalledWith(playBody);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ data: null });
    });
  });

  describe("getTopTracks", () => {
    it("responds with 200 and { data: items } from use case", async () => {
      const items = [{ trackName: "Song A", playCount: 5, artist: "Artist A" }];
      vi.mocked(useCases.getTopTracks).mockResolvedValue(items as never);

      const res = mockRes();
      await controller.getTopTracks(mockReq({}, { limit: "10" }) as never, res);

      expect(useCases.getTopTracks).toHaveBeenCalledOnce();
      expect(res.json).toHaveBeenCalledWith({ data: items });
    });

    it("responds with { data: [] } for empty history (S-08)", async () => {
      const res = mockRes();
      await controller.getTopTracks(mockReq({}, {}) as never, res);

      expect(res.json).toHaveBeenCalledWith({ data: [] });
    });

    it("passes the parsed limit to the use case", async () => {
      const res = mockRes();
      await controller.getTopTracks(mockReq({}, { limit: "20" }) as never, res);

      expect(useCases.getTopTracks).toHaveBeenCalledWith(20);
    });

    it("uses no argument (undefined) when limit param is missing, letting use case apply default", async () => {
      const res = mockRes();
      await controller.getTopTracks(mockReq({}, {}) as never, res);

      expect(useCases.getTopTracks).toHaveBeenCalledWith(undefined);
    });
  });

  describe("getTopArtists", () => {
    it("responds with 200 and { data: items } from use case", async () => {
      const items = [{ artist: "Artist A", playCount: 8 }];
      vi.mocked(useCases.getTopArtists).mockResolvedValue(items as never);

      const res = mockRes();
      await controller.getTopArtists(mockReq({}, { limit: "10" }) as never, res);

      expect(useCases.getTopArtists).toHaveBeenCalledOnce();
      expect(res.json).toHaveBeenCalledWith({ data: items });
    });

    it("responds with { data: [] } for empty history (REQ-LH-016)", async () => {
      const res = mockRes();
      await controller.getTopArtists(mockReq({}, {}) as never, res);

      expect(res.json).toHaveBeenCalledWith({ data: [] });
    });

    it("passes the parsed limit to the use case", async () => {
      const res = mockRes();
      await controller.getTopArtists(mockReq({}, { limit: "15" }) as never, res);

      expect(useCases.getTopArtists).toHaveBeenCalledWith(15);
    });

    it("uses no argument (undefined) when limit param is missing", async () => {
      const res = mockRes();
      await controller.getTopArtists(mockReq({}, {}) as never, res);

      expect(useCases.getTopArtists).toHaveBeenCalledWith(undefined);
    });
  });

  describe("getRecentPlays", () => {
    it("responds with 200 and { data: items } from use case", async () => {
      const items = [{ trackName: "Song B", playedAt: 1_700_000_000_000 }];
      vi.mocked(useCases.getRecentPlays).mockResolvedValue(items as never);

      const res = mockRes();
      await controller.getRecentPlays(mockReq({}, { limit: "20" }) as never, res);

      expect(useCases.getRecentPlays).toHaveBeenCalledOnce();
      expect(res.json).toHaveBeenCalledWith({ data: items });
    });

    it("responds with { data: [] } for empty history (REQ-LH-020)", async () => {
      const res = mockRes();
      await controller.getRecentPlays(mockReq({}, {}) as never, res);

      expect(res.json).toHaveBeenCalledWith({ data: [] });
    });

    it("passes the parsed limit to the use case", async () => {
      const res = mockRes();
      await controller.getRecentPlays(mockReq({}, { limit: "50" }) as never, res);

      expect(useCases.getRecentPlays).toHaveBeenCalledWith(50);
    });

    it("uses no argument (undefined) when limit param is missing", async () => {
      const res = mockRes();
      await controller.getRecentPlays(mockReq({}, {}) as never, res);

      expect(useCases.getRecentPlays).toHaveBeenCalledWith(undefined);
    });
  });
});
