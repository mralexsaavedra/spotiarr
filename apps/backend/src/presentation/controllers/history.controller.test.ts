import type { Request, Response } from "express";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HistoryUseCases } from "@/application/use-cases/history/history.use-cases";
import { HistoryController } from "./history.controller";

function mockRes(): Response {
  return { json: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as Response;
}

function mockReq(body: unknown = {}): Request {
  return { body } as unknown as Request;
}

function makeUseCases(downloads: unknown[] = [], tracks: unknown[] = []): HistoryUseCases {
  return {
    getRecentDownloads: vi.fn().mockResolvedValue(downloads),
    getRecentTracks: vi.fn().mockResolvedValue(tracks),
    recordPlay: vi.fn().mockResolvedValue(undefined),
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
});
