import type { Request, Response } from "express";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ResolveExternalUrlUseCase } from "@/application/use-cases/external-url/resolve-external-url.use-case";
import { ExternalUrlController } from "./external-url.controller";

function mockRes(): Response {
  const json = vi.fn().mockReturnThis();
  const status = vi.fn().mockReturnThis();
  return { json, status } as unknown as Response;
}

function makeReq(query: Record<string, string> = {}): Request {
  return { query } as unknown as Request;
}

function makeUseCaseMock(resolvedUrl: string | null = "https://open.spotify.com/track/abc") {
  return {
    resolve: vi.fn().mockResolvedValue(resolvedUrl),
  } as unknown as ResolveExternalUrlUseCase;
}

describe("ExternalUrlController", () => {
  let controller: ExternalUrlController;
  let useCase: ResolveExternalUrlUseCase;

  beforeEach(() => {
    useCase = makeUseCaseMock();
    controller = new ExternalUrlController(useCase);
  });

  describe("resolve — valid query", () => {
    it("returns 200 with url when use case resolves a url", async () => {
      const res = mockRes();
      await controller.resolve(makeReq({ provider: "spotify", type: "track", id: "abc123" }), res);

      expect(useCase.resolve).toHaveBeenCalledWith({
        provider: "spotify",
        type: "track",
        internalId: "abc123",
        name: undefined,
        artistName: undefined,
      });
      expect(res.json).toHaveBeenCalledWith({ url: "https://open.spotify.com/track/abc" });
    });

    it("passes optional name and artist query params to the use case", async () => {
      const res = mockRes();
      await controller.resolve(
        makeReq({
          provider: "spotify",
          type: "artist",
          id: "x1",
          name: "Daft Punk",
          artist: "Daft Punk",
        }),
        res,
      );

      expect(useCase.resolve).toHaveBeenCalledWith({
        provider: "spotify",
        type: "artist",
        internalId: "x1",
        name: "Daft Punk",
        artistName: "Daft Punk",
      });
    });

    it("returns 404 when use case returns null", async () => {
      vi.mocked(useCase.resolve).mockResolvedValue(null);
      const res = mockRes();
      await controller.resolve(makeReq({ provider: "spotify", type: "album", id: "missing" }), res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "not_found" });
    });

    it("returns 503 when use case throws", async () => {
      vi.mocked(useCase.resolve).mockRejectedValue(new Error("circuit open"));
      const res = mockRes();
      await controller.resolve(makeReq({ provider: "spotify", type: "track", id: "x" }), res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({ error: "service_unavailable", retryable: true });
    });
  });

  describe("resolve — invalid query", () => {
    it("returns 400 when provider is missing", async () => {
      const res = mockRes();
      await controller.resolve(makeReq({ type: "track", id: "abc" }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "invalid_params" }));
      expect(useCase.resolve).not.toHaveBeenCalled();
    });

    it("returns 400 when type is not a valid enum value", async () => {
      const res = mockRes();
      await controller.resolve(makeReq({ provider: "spotify", type: "playlist", id: "abc" }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "invalid_params", details: expect.any(Object) }),
      );
    });

    it("returns 400 when id is empty string", async () => {
      const res = mockRes();
      await controller.resolve(makeReq({ provider: "spotify", type: "track", id: "" }), res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
