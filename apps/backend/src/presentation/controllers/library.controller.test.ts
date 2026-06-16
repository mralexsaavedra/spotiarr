import type { Request, Response } from "express";
import { EventEmitter } from "node:stream";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LibraryAudioPort } from "@/application/ports/library-audio.port";
import type { LibraryImagePort } from "@/application/ports/library-image.port";
import type { LibraryService } from "@/application/services/library.service";
import { LibraryController } from "./library.controller";

function makeJsonRes(): Response {
  const json = vi.fn().mockReturnThis();
  const status = vi.fn().mockReturnThis();
  const type = vi.fn().mockReturnThis();
  const sendFile = vi.fn();
  const setHeader = vi.fn().mockReturnThis();
  const send = vi.fn().mockReturnThis();
  return {
    json,
    status,
    type,
    sendFile,
    setHeader,
    send,
    headersSent: false,
  } as unknown as Response;
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    query: {},
    headers: {},
    ...overrides,
  } as unknown as Request;
}

function makeLibraryService(): LibraryService {
  return {
    getStats: vi.fn().mockResolvedValue({ totalTracks: 10, totalArtists: 3 }),
    getArtists: vi.fn().mockResolvedValue([{ name: "Artist A" }]),
    getArtist: vi.fn().mockResolvedValue({ name: "Artist A", albums: [] }),
    scan: vi.fn().mockResolvedValue({ scanned: 42 }),
  } as unknown as LibraryService;
}

function makeAudioService(): LibraryAudioPort {
  return {
    resolveAudio: vi.fn().mockResolvedValue({
      kind: "accept",
      absolutePath: "/music/song.mp3",
      contentType: "audio/mpeg",
      sizeBytes: 1000,
    }),
    createAudioReadStream: vi
      .fn()
      .mockReturnValue(Object.assign(new EventEmitter(), { pipe: vi.fn() })),
  } as unknown as LibraryAudioPort;
}

function makeImageService(): LibraryImagePort {
  return {
    resolveImage: vi.fn().mockResolvedValue({
      kind: "accept",
      absolutePath: "/covers/img.jpg",
      contentType: "image/jpeg",
    }),
  } as unknown as LibraryImagePort;
}

describe("LibraryController", () => {
  let libraryService: LibraryService;
  let audioService: LibraryAudioPort;
  let imageService: LibraryImagePort;
  let controller: LibraryController;

  beforeEach(() => {
    libraryService = makeLibraryService();
    audioService = makeAudioService();
    imageService = makeImageService();
    controller = new LibraryController(libraryService, audioService, imageService);
  });

  // ─── getStats ─────────────────────────────────────────────────────────────

  describe("getStats", () => {
    it("responds with { data: stats } on success", async () => {
      const stats = { totalTracks: 10, totalArtists: 3 };
      vi.mocked(libraryService.getStats).mockResolvedValue(stats as never);

      const res = makeJsonRes();
      await controller.getStats(makeReq(), res);

      expect(res.json).toHaveBeenCalledWith({ data: stats });
    });

    it("responds with 500 when service throws", async () => {
      vi.mocked(libraryService.getStats).mockRejectedValue(new Error("db error"));

      const res = makeJsonRes();
      await controller.getStats(makeReq(), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "internal_server_error" }),
      );
    });
  });

  // ─── getArtists ───────────────────────────────────────────────────────────

  describe("getArtists", () => {
    it("responds with { data: artists } on success", async () => {
      const artists = [{ name: "Artist A" }, { name: "Artist B" }];
      vi.mocked(libraryService.getArtists).mockResolvedValue(artists as never);

      const res = makeJsonRes();
      await controller.getArtists(makeReq(), res);

      expect(res.json).toHaveBeenCalledWith({ data: artists });
    });

    it("responds with 500 when service throws", async () => {
      vi.mocked(libraryService.getArtists).mockRejectedValue(new Error("fail"));

      const res = makeJsonRes();
      await controller.getArtists(makeReq(), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "internal_server_error" }),
      );
    });
  });

  // ─── getArtist ────────────────────────────────────────────────────────────

  describe("getArtist", () => {
    it("decodes param and responds with { data: artist } on success", async () => {
      const artist = { name: "Daft Punk", albums: [] };
      vi.mocked(libraryService.getArtist).mockResolvedValue(artist as never);

      const res = makeJsonRes();
      await controller.getArtist(
        makeReq({ params: { name: encodeURIComponent("Daft Punk") } }),
        res,
      );

      expect(libraryService.getArtist).toHaveBeenCalledWith("Daft Punk");
      expect(res.json).toHaveBeenCalledWith({ data: artist });
    });

    it("responds with 404 when service returns null", async () => {
      vi.mocked(libraryService.getArtist).mockResolvedValue(null as never);

      const res = makeJsonRes();
      await controller.getArtist(makeReq({ params: { name: "Unknown" } }), res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "internal_server_error" }),
      );
    });

    it("responds with 500 when service throws", async () => {
      vi.mocked(libraryService.getArtist).mockRejectedValue(new Error("db fail"));

      const res = makeJsonRes();
      await controller.getArtist(makeReq({ params: { name: "ArtistX" } }), res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── getImage ─────────────────────────────────────────────────────────────

  describe("getImage", () => {
    it("calls resolveImage with the path query param and sends file", async () => {
      const res = makeJsonRes();
      await controller.getImage(makeReq({ query: { path: "/covers/img.jpg" } }), res);

      expect(imageService.resolveImage).toHaveBeenCalledWith("/covers/img.jpg");
      expect(res.type).toHaveBeenCalledWith("image/jpeg");
      expect(res.sendFile).toHaveBeenCalledWith(
        "/covers/img.jpg",
        { dotfiles: "allow" },
        expect.any(Function),
      );
    });

    it("responds 400 when image service rejects with missing-path", async () => {
      vi.mocked(imageService.resolveImage).mockResolvedValue({
        kind: "reject",
        reason: "missing-path",
      } as never);

      const res = makeJsonRes();
      await controller.getImage(makeReq({ query: {} }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "invalid_request" }));
    });

    it("responds 404 when image service rejects with not-found reason", async () => {
      vi.mocked(imageService.resolveImage).mockResolvedValue({
        kind: "reject",
        reason: "not-found",
      } as never);

      const res = makeJsonRes();
      await controller.getImage(makeReq({ query: { path: "/missing.jpg" } }), res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "file_not_found" }));
    });

    it("responds 500 when resolveImage throws", async () => {
      vi.mocked(imageService.resolveImage).mockRejectedValue(new Error("io error"));

      const res = makeJsonRes();
      await controller.getImage(makeReq({ query: { path: "/img.jpg" } }), res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── streamAudio ──────────────────────────────────────────────────────────

  describe("streamAudio", () => {
    it("streams full file when no Range header", async () => {
      const fakeStream = Object.assign(new EventEmitter(), { pipe: vi.fn() });
      vi.mocked(audioService.createAudioReadStream).mockReturnValue(fakeStream as never);

      const res = makeJsonRes();
      await controller.streamAudio(makeReq({ query: { path: "/song.mp3" } }), res);

      expect(res.setHeader).toHaveBeenCalledWith("Accept-Ranges", "bytes");
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "audio/mpeg");
      expect(res.setHeader).toHaveBeenCalledWith("Content-Length", "1000");
      expect(fakeStream.pipe).toHaveBeenCalledWith(res);
    });

    it("responds 206 with correct Content-Range for partial request", async () => {
      const fakeStream = Object.assign(new EventEmitter(), { pipe: vi.fn() });
      vi.mocked(audioService.createAudioReadStream).mockReturnValue(fakeStream as never);

      const res = makeJsonRes();
      await controller.streamAudio(
        makeReq({ query: { path: "/song.mp3" }, headers: { range: "bytes=0-499" } }),
        res,
      );

      expect(res.status).toHaveBeenCalledWith(206);
      expect(res.setHeader).toHaveBeenCalledWith("Content-Range", "bytes 0-499/1000");
      expect(res.setHeader).toHaveBeenCalledWith("Content-Length", "500");
      expect(audioService.createAudioReadStream).toHaveBeenCalledWith("/music/song.mp3", {
        start: 0,
        end: 499,
      });
    });

    it("responds 400 when audio service rejects with missing-path", async () => {
      vi.mocked(audioService.resolveAudio).mockResolvedValue({
        kind: "reject",
        reason: "missing-path",
      } as never);

      const res = makeJsonRes();
      await controller.streamAudio(makeReq({ query: {} }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "invalid_request" }));
    });

    it("responds 404 when audio service rejects with not-found reason", async () => {
      vi.mocked(audioService.resolveAudio).mockResolvedValue({
        kind: "reject",
        reason: "not-found",
      } as never);

      const res = makeJsonRes();
      await controller.streamAudio(makeReq({ query: { path: "/missing.mp3" } }), res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "file_not_found" }));
    });

    it("responds 416 for an invalid byte range", async () => {
      const res = makeJsonRes();
      await controller.streamAudio(
        makeReq({
          query: { path: "/song.mp3" },
          headers: { range: "bytes=bad-range" },
        }),
        res,
      );

      expect(res.setHeader).toHaveBeenCalledWith("Content-Range", "bytes */1000");
      expect(res.status).toHaveBeenCalledWith(416);
    });

    it("responds 500 when resolveAudio throws", async () => {
      vi.mocked(audioService.resolveAudio).mockRejectedValue(new Error("disk error"));

      const res = makeJsonRes();
      await controller.streamAudio(makeReq({ query: { path: "/song.mp3" } }), res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── scan ─────────────────────────────────────────────────────────────────

  describe("scan", () => {
    it("responds with { data: result } on success", async () => {
      const result = { scanned: 42 };
      vi.mocked(libraryService.scan).mockResolvedValue(result as never);

      const res = makeJsonRes();
      await controller.scan(makeReq(), res);

      expect(res.json).toHaveBeenCalledWith({ data: result });
    });

    it("responds with 500 when service throws", async () => {
      vi.mocked(libraryService.scan).mockRejectedValue(new Error("scan failed"));

      const res = makeJsonRes();
      await controller.scan(makeReq(), res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
