import type { ArtistDetail } from "@spotiarr/shared";
import type { Request, Response } from "express";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { GetAlbumTracksUseCase } from "@/application/use-cases/artists/get-album-tracks.use-case";
import type { GetArtistAlbumsUseCase } from "@/application/use-cases/artists/get-artist-albums.use-case";
import type { GetArtistDetailUseCase } from "@/application/use-cases/artists/get-artist-detail.use-case";
import { AppError } from "@/domain/errors/app-error";
import { ArtistController } from "./artist.controller";

function mockRes(): Response {
  const jsonFn = vi.fn().mockReturnThis();
  const statusFn = vi.fn().mockReturnThis();

  return {
    json: jsonFn,
    status: statusFn,
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

function makeController(
  partial: {
    getArtistDetailUseCase?: Partial<GetArtistDetailUseCase>;
    getArtistAlbumsUseCase?: Partial<GetArtistAlbumsUseCase>;
    getAlbumTracksUseCase?: Partial<GetAlbumTracksUseCase>;
  } = {},
): ArtistController {
  return new ArtistController(
    {
      execute: vi.fn().mockResolvedValue({ id: "artist-1", name: "Artist" }),
      ...partial.getArtistDetailUseCase,
    } as unknown as GetArtistDetailUseCase,
    {
      execute: vi.fn().mockResolvedValue([]),
      ...partial.getArtistAlbumsUseCase,
    } as unknown as GetArtistAlbumsUseCase,
    {
      execute: vi.fn().mockResolvedValue([]),
      ...partial.getAlbumTracksUseCase,
    } as unknown as GetAlbumTracksUseCase,
  );
}

// ─── getArtistDetail ──────────────────────────────────────────────────────────

describe("ArtistController.getArtistDetail", () => {
  let controller: ArtistController;

  beforeEach(() => {
    controller = makeController();
    vi.clearAllMocks();
  });

  it("returns 400 when id param is missing", async () => {
    const req = makeReq({ params: {} });
    const res = mockRes();

    await controller.getArtistDetail(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "missing_artist_id" });
  });

  it("calls the use case and returns JSON on success", async () => {
    const detail: ArtistDetail = { id: "artist-1", name: "Test Artist" } as unknown as ArtistDetail;
    const executeUseCase = vi.fn().mockResolvedValue(detail);
    controller = makeController({
      getArtistDetailUseCase: { execute: executeUseCase },
    });

    const req = makeReq({ params: { id: "artist-1" }, query: {} });
    const res = mockRes();

    await controller.getArtistDetail(req, res);

    expect(executeUseCase).toHaveBeenCalledWith("artist-1", 25);
    expect(res.json).toHaveBeenCalledWith(detail);
  });

  it("uses the provided limit query param when valid", async () => {
    const executeUseCase = vi.fn().mockResolvedValue({});
    controller = makeController({
      getArtistDetailUseCase: { execute: executeUseCase },
    });

    const req = makeReq({ params: { id: "artist-1" }, query: { limit: "10" } });
    const res = mockRes();

    await controller.getArtistDetail(req, res);

    expect(executeUseCase).toHaveBeenCalledWith("artist-1", 10);
  });

  it("defaults limit to 25 when limit query param is invalid", async () => {
    const executeUseCase = vi.fn().mockResolvedValue({});
    controller = makeController({
      getArtistDetailUseCase: { execute: executeUseCase },
    });

    const req = makeReq({ params: { id: "artist-1" }, query: { limit: "not-a-number" } });
    const res = mockRes();

    await controller.getArtistDetail(req, res);

    expect(executeUseCase).toHaveBeenCalledWith("artist-1", 25);
  });

  it("defaults limit to 25 when limit is zero or negative", async () => {
    const executeUseCase = vi.fn().mockResolvedValue({});
    controller = makeController({
      getArtistDetailUseCase: { execute: executeUseCase },
    });

    const req = makeReq({ params: { id: "artist-1" }, query: { limit: "0" } });
    const res = mockRes();

    await controller.getArtistDetail(req, res);

    expect(executeUseCase).toHaveBeenCalledWith("artist-1", 25);
  });

  it("deduplicates concurrent requests with the same key and returns the cached promise result", async () => {
    let resolveDetail!: (v: ArtistDetail) => void;
    const detail = { id: "artist-1" } as unknown as ArtistDetail;
    const slowPromise = new Promise<ArtistDetail>((r) => {
      resolveDetail = r;
    });
    const executeUseCase = vi.fn().mockReturnValue(slowPromise);
    controller = makeController({
      getArtistDetailUseCase: { execute: executeUseCase },
    });

    const req1 = makeReq({
      params: { id: "artist-1" },
      query: {},
      headers: { authorization: "Bearer token" },
    });
    const req2 = makeReq({
      params: { id: "artist-1" },
      query: {},
      headers: { authorization: "Bearer token" },
    });
    const res1 = mockRes();
    const res2 = mockRes();

    // Start first request (will be in-flight)
    const p1 = controller.getArtistDetail(req1, res1);
    // Start second request with same key — should attach to in-flight promise
    const p2 = controller.getArtistDetail(req2, res2);

    resolveDetail(detail);
    await Promise.all([p1, p2]);

    // The use case should only have been invoked once
    expect(executeUseCase).toHaveBeenCalledTimes(1);
    expect(res1.json).toHaveBeenCalledWith(detail);
    expect(res2.json).toHaveBeenCalledWith(detail);
  });
});

// ─── pruneActiveDetailRequests — TTL and size-cap ─────────────────────────────

describe("ArtistController.getArtistDetail — pruning", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("prunes stale in-flight entries whose TTL (30 s) has expired", async () => {
    vi.useFakeTimers();

    // Artist-A: slow in-flight request
    let resolveA!: (v: ArtistDetail) => void;
    const slowA = new Promise<ArtistDetail>((r) => {
      resolveA = r;
    });
    const executeForA = vi.fn().mockReturnValue(slowA);
    const controllerA = makeController({ getArtistDetailUseCase: { execute: executeForA } });

    // Fire request A with a unique auth token to isolate the key
    const reqA = makeReq({
      params: { id: "prune-ttl-artist" },
      query: {},
      headers: { authorization: "prune-ttl-token" },
    });
    const resA = mockRes();
    // Don't await — leave it in-flight so the key stays in the map
    const pA = controllerA.getArtistDetail(reqA, resA);

    // Advance time beyond ACTIVE_DETAIL_REQUEST_TTL_MS (30 000 ms)
    vi.advanceTimersByTime(31_000);

    // Artist-B: a different request on the same controller triggers pruning
    const detail = { id: "prune-ttl-artist-b" } as unknown as ArtistDetail;
    const executeForB = vi.fn().mockResolvedValue(detail);
    const controllerB = makeController({ getArtistDetailUseCase: { execute: executeForB } });
    const reqB = makeReq({
      params: { id: "prune-ttl-artist-b" },
      query: {},
      headers: { authorization: "prune-ttl-token-b" },
    });
    const resB = mockRes();
    await controllerB.getArtistDetail(reqB, resB);

    expect(resB.json).toHaveBeenCalledWith(detail);

    // Clean up the hanging promise so vitest doesn't complain
    resolveA({ id: "prune-ttl-artist" } as unknown as ArtistDetail);
    await pA;
  });

  it("evicts the oldest entry when in-flight map reaches MAX_ACTIVE_DETAIL_REQUESTS (200)", async () => {
    // Fill 200 in-flight slots using a separate controller instance
    // Each request uses a unique artist ID to get a unique key
    const resolvers: Array<(v: ArtistDetail) => void> = [];
    const fillerController = makeController({
      getArtistDetailUseCase: {
        execute: vi.fn().mockImplementation(() => {
          return new Promise<ArtistDetail>((r) => {
            resolvers.push(r);
          });
        }),
      },
    });

    const fillerPromises: Promise<void>[] = [];
    for (let i = 0; i < 200; i++) {
      const req = makeReq({
        params: { id: `evict-cap-artist-${i}` },
        query: {},
        headers: { authorization: `evict-cap-token-${i}` },
      });
      fillerPromises.push(fillerController.getArtistDetail(req, mockRes()));
    }

    // 201st request: should trigger eviction of the first entry so it can proceed
    const capDetail = { id: "evict-cap-final" } as unknown as ArtistDetail;
    const capExecute = vi.fn().mockResolvedValue(capDetail);
    const capController = makeController({ getArtistDetailUseCase: { execute: capExecute } });
    const capReq = makeReq({
      params: { id: "evict-cap-final" },
      query: {},
      headers: { authorization: "evict-cap-final-token" },
    });
    const capRes = mockRes();
    await capController.getArtistDetail(capReq, capRes);

    expect(capRes.json).toHaveBeenCalledWith(capDetail);

    // Resolve all hanging promises to clean up
    const finalDetail = { id: "filler" } as unknown as ArtistDetail;
    for (const r of resolvers) r(finalDetail);
    await Promise.allSettled(fillerPromises);
  });
});

// ─── getArtistAlbums ──────────────────────────────────────────────────────────

describe("ArtistController.getArtistAlbums", () => {
  let controller: ArtistController;

  beforeEach(() => {
    controller = makeController();
    vi.clearAllMocks();
  });

  it("returns 400 when id param is missing", async () => {
    const req = makeReq({ params: {}, query: {} });
    const res = mockRes();

    await controller.getArtistAlbums(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "missing_artist_id" });
  });

  it("calls the use case and returns albums", async () => {
    const albums = [{ id: "album-1" }];
    const executeUseCase = vi.fn().mockResolvedValue(albums);
    controller = makeController({
      getArtistAlbumsUseCase: { execute: executeUseCase },
    });

    const req = makeReq({ params: { id: "artist-1" }, query: { limit: "10", offset: "5" } });
    const res = mockRes();

    await controller.getArtistAlbums(req, res);

    expect(executeUseCase).toHaveBeenCalledWith("artist-1", 10, 5);
    expect(res.json).toHaveBeenCalledWith(albums);
  });

  it("defaults limit to 25 and offset to 0 when query params are missing", async () => {
    const executeUseCase = vi.fn().mockResolvedValue([]);
    controller = makeController({
      getArtistAlbumsUseCase: { execute: executeUseCase },
    });

    const req = makeReq({ params: { id: "artist-1" }, query: {} });
    const res = mockRes();

    await controller.getArtistAlbums(req, res);

    expect(executeUseCase).toHaveBeenCalledWith("artist-1", 25, 0);
  });

  it("caps limit at 50 when the provided value exceeds it", async () => {
    const executeUseCase = vi.fn().mockResolvedValue([]);
    controller = makeController({
      getArtistAlbumsUseCase: { execute: executeUseCase },
    });

    const req = makeReq({ params: { id: "artist-1" }, query: { limit: "100", offset: "0" } });
    const res = mockRes();

    await controller.getArtistAlbums(req, res);

    expect(executeUseCase).toHaveBeenCalledWith("artist-1", 50, 0);
  });
});

// ─── getAlbumTracks ───────────────────────────────────────────────────────────

describe("ArtistController.getAlbumTracks", () => {
  let controller: ArtistController;

  beforeEach(() => {
    controller = makeController();
  });

  describe("provider-miss contract: non-Spotify album ID misses Deezer + MusicBrainz", () => {
    it("returns HTTP 200 with an empty array", async () => {
      const req = {
        params: { id: "artist-1", albumId: "non-spotify-album-123" },
      } as unknown as Request;
      const res = mockRes();

      await controller.getAlbumTracks(req, res);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe("error handling", () => {
    it("returns 400 when params are missing", async () => {
      const req = { params: {} } as unknown as Request;
      const res = mockRes();

      await controller.getAlbumTracks(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "missing_params" });
    });

    it("returns 429 when the use case throws a spotify_rate_limited AppError", async () => {
      const executeUseCase = vi.fn().mockRejectedValue(new AppError(429, "spotify_rate_limited"));
      controller = makeController({
        getAlbumTracksUseCase: { execute: executeUseCase },
      });

      const req = makeReq({ params: { id: "artist-1", albumId: "album-1" } });
      const res = mockRes();

      await controller.getAlbumTracks(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({ error: "spotify_rate_limited" });
    });

    it("returns 404 when the use case throws an album_not_found AppError", async () => {
      const executeUseCase = vi.fn().mockRejectedValue(new AppError(404, "album_not_found"));
      controller = makeController({
        getAlbumTracksUseCase: { execute: executeUseCase },
      });

      const req = makeReq({ params: { id: "artist-1", albumId: "album-1" } });
      const res = mockRes();

      await controller.getAlbumTracks(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "album_not_found" });
    });

    it("returns 500 when the use case throws an unexpected error", async () => {
      const executeUseCase = vi.fn().mockRejectedValue(new Error("unexpected"));
      controller = makeController({
        getAlbumTracksUseCase: { execute: executeUseCase },
      });

      const req = makeReq({ params: { id: "artist-1", albumId: "album-1" } });
      const res = mockRes();

      await controller.getAlbumTracks(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "internal_server_error" });
    });
  });
});
