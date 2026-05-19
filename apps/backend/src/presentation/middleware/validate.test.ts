import { Request, Response, NextFunction } from "express";
import { describe, it, expect, vi } from "vitest";
import { createPlaylistSchema } from "@/presentation/routes/schemas/playlist.schema";
import { validate } from "./validate";

function makeReq(body: unknown): Partial<Request> {
  return {
    body,
    query: {},
    params: {} as Record<string, string>,
  };
}

describe("validate middleware", () => {
  it("passes discriminated-union body through unchanged", () => {
    const spotifyUrl = "https://open.spotify.com/album/abc";
    const req = makeReq({ kind: "spotifyUrl", spotifyUrl });
    const next = vi.fn() as NextFunction;
    const res = {} as Response;

    validate(createPlaylistSchema)(req as Request, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
    expect(req.body.kind).toBe("spotifyUrl");
    expect(req.body.spotifyUrl).toBe(spotifyUrl);
  });

  it("transforms legacy { spotifyUrl } body — next middleware receives kind field", () => {
    const spotifyUrl = "https://open.spotify.com/album/abc";
    const req = makeReq({ spotifyUrl });
    const next = vi.fn() as NextFunction;
    const res = {} as Response;

    validate(createPlaylistSchema)(req as Request, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
    expect(req.body.kind).toBe("spotifyUrl");
    expect(req.body.spotifyUrl).toBe(spotifyUrl);
  });

  it("rejects invalid body with 400", () => {
    const req = makeReq({ invalid: true });
    const next = vi.fn() as NextFunction;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    validate(createPlaylistSchema)(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
