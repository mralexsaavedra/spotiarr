import type { Request, Response } from "express";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SettingsService } from "@/application/services/settings.service";
import { COOKIE_NAME, verifyCookie } from "../middleware/cookie";
import { AuthController } from "./auth.controller";

const VALID_TOKEN = "a-valid-token-at-least-16-chars";
const SESSION_TTL_HOURS = 1;

function mockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function makeSettingsService(): SettingsService {
  return {
    getString: vi.fn(),
    setString: vi.fn(),
    getNumber: vi.fn(),
    setNumber: vi.fn(),
    getBoolean: vi.fn(),
    setBoolean: vi.fn(),
  } as unknown as SettingsService;
}

function makeSpotifyAuthService() {
  return {
    exchangeCodeForToken: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
  };
}

function makeController(token: string = VALID_TOKEN) {
  return new AuthController(
    makeSpotifyAuthService(),
    makeSettingsService(),
    "client-id",
    "http://localhost/callback",
    token,
    SESSION_TTL_HOURS,
  );
}

function makeControllerNoToken() {
  return new AuthController(
    makeSpotifyAuthService(),
    makeSettingsService(),
    "client-id",
    "http://localhost/callback",
    undefined,
    SESSION_TTL_HOURS,
  );
}

describe("AuthController.unlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 {ok:true} and sets the session cookie when token is correct", () => {
    const controller = makeController(VALID_TOKEN);
    const req = {
      body: { token: VALID_TOKEN },
      secure: false,
    } as unknown as Request;
    const res = mockRes();

    controller.unlock(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(res.cookie).toHaveBeenCalledWith(
      COOKIE_NAME,
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
    );
  });

  it("cookie value is a valid signed payload verifiable with the same token", () => {
    const controller = makeController(VALID_TOKEN);
    const req = {
      body: { token: VALID_TOKEN },
      secure: false,
    } as unknown as Request;
    const res = mockRes();

    controller.unlock(req, res);

    const [, cookieValue] = (res.cookie as ReturnType<typeof vi.fn>).mock.calls[0];
    const payload = verifyCookie(cookieValue as string, VALID_TOKEN);
    expect(payload).not.toBeNull();
    expect(typeof payload!.iat).toBe("number");
    expect(typeof payload!.exp).toBe("number");
    expect(payload!.exp).toBeGreaterThan(payload!.iat);
  });

  it("returns 401 {error:'invalid_token'} when token is wrong", () => {
    const controller = makeController(VALID_TOKEN);
    const req = {
      body: { token: "wrong-token-value" },
      secure: false,
    } as unknown as Request;
    const res = mockRes();

    controller.unlock(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "invalid_token" });
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it("returns 401 for wrong token of a DIFFERENT length (constant-time comparison stays safe)", () => {
    const controller = makeController(VALID_TOKEN);
    const req = {
      body: { token: "x" },
      secure: false,
    } as unknown as Request;
    const res = mockRes();

    controller.unlock(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "invalid_token" });
  });

  it("returns 200 {ok:true} as no-op when spotiarrToken is undefined (auth disabled)", () => {
    const controller = makeControllerNoToken();
    const req = {
      body: { token: "any-token" },
      secure: false,
    } as unknown as Request;
    const res = mockRes();

    controller.unlock(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it("returns 401 when body token field is missing", () => {
    const controller = makeController(VALID_TOKEN);
    const req = {
      body: {},
      secure: false,
    } as unknown as Request;
    const res = mockRes();

    controller.unlock(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "invalid_token" });
  });

  it("sets secure:true on the cookie when req.secure is true", () => {
    const controller = makeController(VALID_TOKEN);
    const req = {
      body: { token: VALID_TOKEN },
      secure: true,
    } as unknown as Request;
    const res = mockRes();

    controller.unlock(req, res);

    const [, , options] = (res.cookie as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.secure).toBe(true);
  });

  it("sets secure:false on the cookie when req.secure is false", () => {
    const controller = makeController(VALID_TOKEN);
    const req = {
      body: { token: VALID_TOKEN },
      secure: false,
    } as unknown as Request;
    const res = mockRes();

    controller.unlock(req, res);

    const [, , options] = (res.cookie as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.secure).toBe(false);
  });

  it("sets cookie maxAge equal to SESSION_TTL_HOURS * 3600 * 1000", () => {
    const controller = makeController(VALID_TOKEN);
    const req = {
      body: { token: VALID_TOKEN },
      secure: false,
    } as unknown as Request;
    const res = mockRes();

    controller.unlock(req, res);

    const [, , options] = (res.cookie as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.maxAge).toBe(SESSION_TTL_HOURS * 3600 * 1000);
  });

  it("cookie payload TTL equals SESSION_TTL_HOURS * 3600 seconds", () => {
    const controller = makeController(VALID_TOKEN);
    const req = {
      body: { token: VALID_TOKEN },
      secure: false,
    } as unknown as Request;
    const res = mockRes();

    controller.unlock(req, res);

    const [, cookieValue] = (res.cookie as ReturnType<typeof vi.fn>).mock.calls[0];
    const payload = verifyCookie(cookieValue as string, VALID_TOKEN);
    expect(payload).not.toBeNull();
    expect(payload!.exp - payload!.iat).toBe(SESSION_TTL_HOURS * 3600);
  });
});

describe("AuthController.session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns {tokenRequired:false} when spotiarrToken is undefined", () => {
    const controller = makeControllerNoToken();
    const req = {} as Request;
    const res = mockRes();

    controller.session(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ tokenRequired: false });
  });

  it("returns {tokenRequired:true} when spotiarrToken is set", () => {
    const controller = makeController(VALID_TOKEN);
    const req = {} as Request;
    const res = mockRes();

    controller.session(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ tokenRequired: true });
  });
});
