import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  clearUnauthorizedHandler,
  httpClient,
  setUnauthorizedHandler,
} from "./httpClient";

const makeResponse = (status: number, body?: unknown): Response => {
  const text = body !== undefined ? JSON.stringify(body) : "";
  return {
    status,
    ok: status >= 200 && status < 300,
    text: () => Promise.resolve(text),
    statusText: String(status),
  } as unknown as Response;
};

afterEach(() => {
  clearUnauthorizedHandler();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("setUnauthorizedHandler / clearUnauthorizedHandler", () => {
  it("registers a handler that is called on 401 non-auth endpoint", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(401)));

    await expect(httpClient.get("/playlists")).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("clearUnauthorizedHandler removes the handler", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    clearUnauthorizedHandler();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(401)));

    await expect(httpClient.get("/playlists")).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("401 handling", () => {
  beforeEach(() => {
    setUnauthorizedHandler(vi.fn());
  });

  it("fires the handler and throws ApiError(401) for non-auth endpoint", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(401)));

    await expect(httpClient.get("/playlists")).rejects.toMatchObject({
      status: 401,
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does NOT fire handler on 401 for /auth/session", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(401)));

    await expect(httpClient.get("/auth/session")).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
  });

  it("does NOT fire handler on 401 for /auth/unlock", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(401)));

    await expect(httpClient.post("/auth/unlock", { token: "x" })).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
  });

  it("fires onUnauthorized for /auth/sessionXYZ (not a real auth endpoint)", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(401)));

    await expect(httpClient.get("/auth/sessionXYZ")).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe("successful response", () => {
  it("returns parsed JSON and does not fire the handler", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    const payload = { id: 1, name: "foo" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(200, payload)));

    const result = await httpClient.get("/playlists");
    expect(result).toEqual(payload);
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns undefined for 204 No Content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 204,
        ok: true,
        text: () => Promise.resolve(""),
      } as unknown as Response),
    );

    const result = await httpClient.delete("/playlists/1");
    expect(result).toBeUndefined();
  });
});

describe("non-ok response", () => {
  it("throws ApiError with code and status from the response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(makeResponse(422, { error: "VALIDATION_ERROR", message: "bad input" })),
    );

    await expect(httpClient.post("/playlists", {})).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "bad input",
    });
  });

  it("throws ApiError with statusText when body has no error shape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(500, { detail: "crash" })));

    const err = await httpClient.get("/playlists").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(500);
  });
});

describe("network failure", () => {
  it("propagates raw TypeError when fetch itself rejects — does NOT wrap in ApiError and does NOT fire onUnauthorized", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    const networkError = new TypeError("Failed to fetch");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(networkError));

    const err = await httpClient.get("/playlists").catch((e: unknown) => e);

    expect(err).toBe(networkError);
    expect(err).not.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("request options", () => {
  it("sends credentials: same-origin on every request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, {}));
    vi.stubGlobal("fetch", fetchMock);

    await httpClient.get("/playlists");
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ credentials: "same-origin" });
  });

  it("sends Content-Type: application/json header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, {}));
    vi.stubGlobal("fetch", fetchMock);

    await httpClient.get("/playlists");
    expect(fetchMock.mock.calls[0]![1]?.headers).toMatchObject({
      "Content-Type": "application/json",
    });
  });
});
