import type { NextFunction, Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUnlockRateLimit } from "./auth.routes";

function mockReq(ip: string = "127.0.0.1"): Request {
  return { ip } as unknown as Request;
}

function mockRes(): Response {
  return {
    set: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe("createUnlockRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls next() when request count is under the limit", () => {
    const middleware = createUnlockRateLimit(() => 3);
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After header when limit is exceeded within the window", () => {
    const middleware = createUnlockRateLimit(() => 2);
    const ip = "10.0.0.1";

    for (let i = 0; i < 2; i++) {
      const next = vi.fn() as NextFunction;
      middleware(mockReq(ip), mockRes(), next);
      expect(next).toHaveBeenCalledOnce();
    }

    const res = mockRes();
    const next = vi.fn() as NextFunction;
    middleware(mockReq(ip), res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({ error: "rate_limiter_overflow" });
    expect(res.set).toHaveBeenCalledWith("Retry-After", expect.any(String));
    expect(next).not.toHaveBeenCalled();
  });

  it("resets the count after the window elapses and calls next()", () => {
    const middleware = createUnlockRateLimit(() => 1);
    const ip = "10.0.0.2";

    middleware(mockReq(ip), mockRes(), vi.fn() as NextFunction);

    const blockedRes = mockRes();
    const blockedNext = vi.fn() as NextFunction;
    middleware(mockReq(ip), blockedRes, blockedNext);
    expect(blockedRes.status).toHaveBeenCalledWith(429);
    expect(blockedNext).not.toHaveBeenCalled();

    vi.advanceTimersByTime(61_000);

    const afterRes = mockRes();
    const afterNext = vi.fn() as NextFunction;
    middleware(mockReq(ip), afterRes, afterNext);

    expect(afterNext).toHaveBeenCalledOnce();
    expect(afterRes.status).not.toHaveBeenCalled();
  });

  it("gives distinct IPs independent buckets", () => {
    const middleware = createUnlockRateLimit(() => 1);
    const ipA = "192.168.1.1";
    const ipB = "192.168.1.2";

    middleware(mockReq(ipA), mockRes(), vi.fn() as NextFunction);

    const resB = mockRes();
    const nextB = vi.fn() as NextFunction;
    middleware(mockReq(ipB), resB, nextB);

    expect(nextB).toHaveBeenCalledOnce();
    expect(resB.status).not.toHaveBeenCalled();
  });
});
