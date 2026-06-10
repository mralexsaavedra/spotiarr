import type { NextFunction, Request, Response } from "express";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { signCookie, COOKIE_NAME } from "./cookie";
import { createRequireTokenMiddleware } from "./require-token";

const SECRET = "a-valid-secret-for-testing-1234";

function mockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function makeReq(override: Partial<Request> = {}): Partial<Request> {
  return {
    method: "GET",
    path: "/some/protected",
    headers: {},
    ...override,
  };
}

function signedCookieHeader(): string {
  const now = Math.floor(Date.now() / 1000);
  const value = signCookie({ iat: now, exp: now + 3600 }, SECRET);
  return `${COOKIE_NAME}=${value}`;
}

describe("createRequireTokenMiddleware — open mode (no token)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls next() without 401 when getToken returns undefined", () => {
    const middleware = createRequireTokenMiddleware(() => undefined);
    const req = makeReq();
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    middleware(req as Request, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("createRequireTokenMiddleware — token set, no cookie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 {error:'unauthorized'} and does NOT call next", () => {
    const middleware = createRequireTokenMiddleware(() => SECRET);
    const req = makeReq({ method: "GET", path: "/protected" });
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    middleware(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("createRequireTokenMiddleware — token set, valid cookie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls next() when the cookie was signed with the same secret", () => {
    const middleware = createRequireTokenMiddleware(() => SECRET);
    const req = makeReq({
      method: "GET",
      path: "/protected",
      headers: { cookie: signedCookieHeader() },
    });
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    middleware(req as Request, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("createRequireTokenMiddleware — token set, tampered/invalid cookie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for a cookie signed with a different secret", () => {
    const middleware = createRequireTokenMiddleware(() => SECRET);
    const now = Math.floor(Date.now() / 1000);
    const badValue = signCookie({ iat: now, exp: now + 3600 }, "wrong-secret");
    const req = makeReq({
      headers: { cookie: `${COOKIE_NAME}=${badValue}` },
    });
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    middleware(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 for a completely garbage cookie value", () => {
    const middleware = createRequireTokenMiddleware(() => SECRET);
    const req = makeReq({
      headers: { cookie: `${COOKIE_NAME}=GARBAGE!!!` },
    });
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    middleware(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when the cookie has expired", () => {
    const middleware = createRequireTokenMiddleware(() => SECRET);
    const past = Math.floor(Date.now() / 1000) - 7200;
    const expiredValue = signCookie({ iat: past - 3600, exp: past }, SECRET);
    const req = makeReq({
      headers: { cookie: `${COOKIE_NAME}=${expiredValue}` },
    });
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    middleware(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("createRequireTokenMiddleware — allowlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const allowlisted: Array<{ method: string; path: string }> = [
    { method: "POST", path: "/auth/unlock" },
    { method: "GET", path: "/health" },
    { method: "GET", path: "/auth/spotify/callback" },
  ];

  it.each(allowlisted)(
    "$method $path bypasses auth even with token set and no cookie",
    ({ method, path }) => {
      const middleware = createRequireTokenMiddleware(() => SECRET);
      const req = makeReq({ method, path });
      const res = mockRes();
      const next = vi.fn() as NextFunction;

      middleware(req as Request, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    },
  );

  it("GET /auth/session is NOT allowlisted — returns 401 with token set and no cookie", () => {
    const middleware = createRequireTokenMiddleware(() => SECRET);
    const req = makeReq({ method: "GET", path: "/auth/session" });
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    middleware(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("GET /auth/unlock (wrong method) is NOT bypassed — returns 401 with no cookie", () => {
    const middleware = createRequireTokenMiddleware(() => SECRET);
    const req = makeReq({ method: "GET", path: "/auth/unlock" });
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    middleware(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("POST /health (wrong method) is NOT bypassed — returns 401 with no cookie", () => {
    const middleware = createRequireTokenMiddleware(() => SECRET);
    const req = makeReq({ method: "POST", path: "/health" });
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    middleware(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("createRequireTokenMiddleware — expiry boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a cookie where exp === nowSeconds (boundary: not-yet-expired is strictly greater)", () => {
    const middleware = createRequireTokenMiddleware(() => SECRET);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const value = signCookie({ iat: nowSeconds - 3600, exp: nowSeconds }, SECRET);
    const req = makeReq({
      method: "GET",
      path: "/protected",
      headers: { cookie: `${COOKIE_NAME}=${value}` },
    });
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    middleware(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts a cookie where exp === nowSeconds + 60 (clearly in the future)", () => {
    const middleware = createRequireTokenMiddleware(() => SECRET);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const value = signCookie({ iat: nowSeconds, exp: nowSeconds + 60 }, SECRET);
    const req = makeReq({
      method: "GET",
      path: "/protected",
      headers: { cookie: `${COOKIE_NAME}=${value}` },
    });
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    middleware(req as Request, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("createRequireTokenMiddleware — multi-cookie header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts the session cookie from a multi-cookie header and calls next()", () => {
    const middleware = createRequireTokenMiddleware(() => SECRET);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const value = signCookie({ iat: nowSeconds, exp: nowSeconds + 3600 }, SECRET);
    const req = makeReq({
      method: "GET",
      path: "/protected",
      headers: { cookie: `foo=1; ${COOKIE_NAME}=${value}; bar=2` },
    });
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    middleware(req as Request, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
