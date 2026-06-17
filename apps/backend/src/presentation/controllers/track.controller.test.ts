import type { Request, Response } from "express";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DeleteTrackUseCase } from "@/application/use-cases/tracks/delete-track.use-case";
import type { GetTracksUseCase } from "@/application/use-cases/tracks/get-tracks.use-case";
import type { RetryTrackDownloadUseCase } from "@/application/use-cases/tracks/retry-track-download.use-case";
import { TrackController } from "./track.controller";

function makeRes(): Response {
  const json = vi.fn().mockReturnThis();
  const status = vi.fn().mockReturnThis();
  const send = vi.fn().mockReturnThis();
  return { json, status, send } as unknown as Response;
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return { params: {}, ...overrides } as unknown as Request;
}

function makeMocks() {
  const deleteTrackUseCase = {
    execute: vi.fn().mockResolvedValue(undefined),
  } as unknown as DeleteTrackUseCase;
  const getTracksUseCase = {
    getAllByPlaylist: vi.fn().mockResolvedValue([]),
  } as unknown as GetTracksUseCase;
  const retryTrackDownloadUseCase = {
    execute: vi.fn().mockResolvedValue(undefined),
  } as unknown as RetryTrackDownloadUseCase;
  return { deleteTrackUseCase, getTracksUseCase, retryTrackDownloadUseCase };
}

describe("TrackController", () => {
  let mocks: ReturnType<typeof makeMocks>;
  let controller: TrackController;

  beforeEach(() => {
    mocks = makeMocks();
    controller = new TrackController(
      mocks.deleteTrackUseCase,
      mocks.getTracksUseCase,
      mocks.retryTrackDownloadUseCase,
    );
  });

  describe("getAllByPlaylist", () => {
    it("calls use case with playlist id from params and responds { data: tracks }", async () => {
      const tracks = [{ id: "t1" }, { id: "t2" }];
      vi.mocked(mocks.getTracksUseCase.getAllByPlaylist).mockResolvedValue(tracks as never);

      const res = makeRes();
      await controller.getAllByPlaylist(makeReq({ params: { id: "pl-abc" } }), res);

      expect(mocks.getTracksUseCase.getAllByPlaylist).toHaveBeenCalledWith("pl-abc");
      expect(res.json).toHaveBeenCalledWith({ data: tracks });
    });

    it("responds { data: [] } when playlist has no tracks", async () => {
      const res = makeRes();
      await controller.getAllByPlaylist(makeReq({ params: { id: "empty-pl" } }), res);

      expect(res.json).toHaveBeenCalledWith({ data: [] });
    });
  });

  describe("remove", () => {
    it("calls delete use case with id from params and responds 204", async () => {
      const res = makeRes();
      await controller.remove(makeReq({ params: { id: "track-99" } }), res);

      expect(mocks.deleteTrackUseCase.execute).toHaveBeenCalledWith("track-99");
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe("retry", () => {
    it("calls retry use case with id from params and responds 204", async () => {
      const res = makeRes();
      await controller.retry(makeReq({ params: { id: "track-77" } }), res);

      expect(mocks.retryTrackDownloadUseCase.execute).toHaveBeenCalledWith("track-77");
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });
});
