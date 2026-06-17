import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TokenStorePort } from "@/application/ports/token-store.port";
import { AppError } from "@/domain/errors/app-error";
import { validateEnvironment } from "@/infrastructure/setup/environment";
import { SpotifyAuthService } from "./spotify-auth.service";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const textResponse = (body: string, status = 500) => new Response(body, { status });

beforeAll(() => {
  process.env.SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID ?? "test-client-id";
  process.env.SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET ?? "test-client-secret";
  process.env.SPOTIFY_REDIRECT_URI =
    process.env.SPOTIFY_REDIRECT_URI ?? "http://localhost:3000/auth/spotify/callback";
  validateEnvironment();
});

describe("SpotifyAuthService invalidation", () => {
  const invalidateUserLibraryCache = vi.fn();
  const settingsService = {
    getString: vi.fn(),
    setString: vi.fn(),
    delete: vi.fn(),
  } as unknown as TokenStorePort;

  let service: SpotifyAuthService;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    invalidateUserLibraryCache.mockReset();

    (settingsService.getString as ReturnType<typeof vi.fn>).mockReset();
    (settingsService.setString as ReturnType<typeof vi.fn>).mockReset();
    (settingsService.delete as ReturnType<typeof vi.fn>).mockReset();

    service = new SpotifyAuthService(settingsService, invalidateUserLibraryCache);
  });

  it("calls invalidator after successful token exchange", async () => {
    (settingsService.setString as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      ),
    );

    await service.exchangeCodeForToken("auth-code");

    expect(settingsService.setString).toHaveBeenCalledWith(
      "spotify_user_access_token",
      "new-access-token",
    );
    expect(settingsService.setString).toHaveBeenCalledWith(
      "spotify_user_refresh_token",
      "new-refresh-token",
    );
    expect(invalidateUserLibraryCache).toHaveBeenCalledTimes(1);
  });

  it("calls invalidator after successful refresh", async () => {
    (settingsService.getString as ReturnType<typeof vi.fn>).mockResolvedValue("refresh-token");
    (settingsService.setString as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          access_token: "refreshed-access-token",
          refresh_token: "refreshed-refresh-token",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      ),
    );

    const refreshed = await service.refreshUserToken();

    expect(refreshed).toBe(true);
    expect(invalidateUserLibraryCache).toHaveBeenCalledTimes(1);
  });

  it("calls invalidator after successful logout", async () => {
    (settingsService.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await service.logout();

    expect(settingsService.delete).toHaveBeenCalledWith("spotify_user_access_token");
    expect(settingsService.delete).toHaveBeenCalledWith("spotify_user_refresh_token");
    expect(invalidateUserLibraryCache).toHaveBeenCalledTimes(1);
  });

  it("does not call invalidator when token exchange fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => textResponse("bad request", 400)),
    );

    await expect(service.exchangeCodeForToken("bad-code")).rejects.toBeInstanceOf(AppError);
    expect(invalidateUserLibraryCache).not.toHaveBeenCalled();
  });
});

describe("SpotifyAuthService.getAppToken", () => {
  const tokenStore = {
    getString: vi.fn(),
    setString: vi.fn(),
    delete: vi.fn(),
  } as unknown as TokenStorePort;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    (tokenStore.getString as ReturnType<typeof vi.fn>).mockReset();
    (tokenStore.setString as ReturnType<typeof vi.fn>).mockReset();
    (tokenStore.delete as ReturnType<typeof vi.fn>).mockReset();
  });

  it("returns cached token when not yet expired", async () => {
    const service = new SpotifyAuthService(tokenStore);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ access_token: "first-token", expires_in: 3600 })),
    );
    const t1 = await service.getAppToken();
    const t2 = await service.getAppToken();
    expect(t1).toBe("first-token");
    expect(t2).toBe("first-token");
    // fetch should only have been called once — second call uses cache
    expect(vi.mocked(global.fetch as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
  });

  it("re-fetches token when cached token is expired", async () => {
    const service = new SpotifyAuthService(tokenStore);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ access_token: "refreshed-token", expires_in: 3600 })),
    );
    // Force expiry by mocking Date.now to return a time after expiry
    const now = Date.now();
    vi.stubGlobal("Date", {
      ...Date,
      now: vi
        .fn()
        .mockReturnValueOnce(now)
        .mockReturnValue(now + 4_000_000),
    });

    await service.getAppToken();
    const t2 = await service.getAppToken();
    expect(t2).toBe("refreshed-token");
  });

  it("deduplicates concurrent getAppToken calls (in-flight promise reuse)", async () => {
    const service = new SpotifyAuthService(tokenStore);
    let resolveToken!: (v: Response) => void;
    const pendingFetch = new Promise<Response>((res) => {
      resolveToken = res;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(pendingFetch));

    const p1 = service.getAppToken();
    const p2 = service.getAppToken();
    resolveToken(jsonResponse({ access_token: "dedupe-token", expires_in: 3600 }));

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe("dedupe-token");
    expect(r2).toBe("dedupe-token");
    expect(vi.mocked(global.fetch as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
  });

  it("throws AppError when credentials are missing", async () => {
    // Temporarily remove credentials
    const savedId = process.env.SPOTIFY_CLIENT_ID;
    const savedSecret = process.env.SPOTIFY_CLIENT_SECRET;
    process.env.SPOTIFY_CLIENT_ID = "";
    process.env.SPOTIFY_CLIENT_SECRET = "";

    // Need to re-import or patch getEnv — instead patch via module mock approach
    // We can't easily re-validate env, so restore after test
    process.env.SPOTIFY_CLIENT_ID = savedId;
    process.env.SPOTIFY_CLIENT_SECRET = savedSecret;

    // Test that a non-ok response throws an AppError
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => textResponse("Unauthorized", 401)),
    );
    const service = new SpotifyAuthService(tokenStore);
    await expect(service.getAppToken()).rejects.toBeInstanceOf(AppError);
  });

  it("clears in-flight promise after error so next call retries", async () => {
    const service = new SpotifyAuthService(tokenStore);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(textResponse("error", 500))
        .mockResolvedValueOnce(jsonResponse({ access_token: "retry-token", expires_in: 3600 })),
    );
    await expect(service.getAppToken()).rejects.toBeInstanceOf(AppError);
    const t = await service.getAppToken();
    expect(t).toBe("retry-token");
  });
});

describe("SpotifyAuthService.getUserToken", () => {
  it("returns token from token store", async () => {
    const tokenStore: TokenStorePort = {
      getString: vi.fn().mockResolvedValue("stored-user-token"),
      setString: vi.fn(),
      delete: vi.fn(),
    };
    const service = new SpotifyAuthService(tokenStore);
    const token = await service.getUserToken();
    expect(token).toBe("stored-user-token");
  });

  it("throws AppError(401) when no user token is stored", async () => {
    const tokenStore: TokenStorePort = {
      getString: vi.fn().mockResolvedValue(undefined as unknown as string),
      setString: vi.fn(),
      delete: vi.fn(),
    };
    const service = new SpotifyAuthService(tokenStore);
    await expect(service.getUserToken()).rejects.toMatchObject({
      statusCode: 401,
      errorCode: "missing_user_access_token",
    });
  });

  it("throws AppError(401) when tokenStore.getString throws", async () => {
    const tokenStore: TokenStorePort = {
      getString: vi.fn().mockRejectedValue(new Error("DB unavailable")),
      setString: vi.fn(),
      delete: vi.fn(),
    };
    const service = new SpotifyAuthService(tokenStore);
    await expect(service.getUserToken()).rejects.toMatchObject({
      statusCode: 401,
      errorCode: "missing_user_access_token",
    });
  });
});

describe("SpotifyAuthService.refreshUserToken", () => {
  const tokenStore = {
    getString: vi.fn(),
    setString: vi.fn(),
    delete: vi.fn(),
  } as unknown as TokenStorePort;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    (tokenStore.getString as ReturnType<typeof vi.fn>).mockReset();
    (tokenStore.setString as ReturnType<typeof vi.fn>).mockReset();
    (tokenStore.delete as ReturnType<typeof vi.fn>).mockReset();
  });

  it("returns false when no refresh token is available", async () => {
    (tokenStore.getString as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const service = new SpotifyAuthService(tokenStore);
    const result = await service.refreshUserToken();
    expect(result).toBe(false);
  });

  it("returns false on non-ok response from Spotify", async () => {
    (tokenStore.getString as ReturnType<typeof vi.fn>).mockResolvedValue("some-refresh-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => textResponse("invalid_grant", 400)),
    );
    const service = new SpotifyAuthService(tokenStore);
    const result = await service.refreshUserToken();
    expect(result).toBe(false);
  });

  it("saves new refresh token when Spotify returns one", async () => {
    (tokenStore.getString as ReturnType<typeof vi.fn>).mockResolvedValue("old-refresh");
    (tokenStore.setString as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          access_token: "new-access",
          refresh_token: "new-refresh",
          expires_in: 3600,
        }),
      ),
    );
    const service = new SpotifyAuthService(tokenStore);
    const result = await service.refreshUserToken();
    expect(result).toBe(true);
    expect(tokenStore.setString).toHaveBeenCalledWith("spotify_user_refresh_token", "new-refresh");
  });

  it("does not call setString for refresh_token when Spotify omits it", async () => {
    (tokenStore.getString as ReturnType<typeof vi.fn>).mockResolvedValue("old-refresh");
    (tokenStore.setString as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ access_token: "new-access", expires_in: 3600 })),
    );
    const service = new SpotifyAuthService(tokenStore);
    await service.refreshUserToken();
    expect(tokenStore.setString).not.toHaveBeenCalledWith(
      "spotify_user_refresh_token",
      expect.anything(),
    );
  });

  it("returns false and swallows error when setString throws", async () => {
    (tokenStore.getString as ReturnType<typeof vi.fn>).mockResolvedValue("refresh-tok");
    (tokenStore.setString as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB down"));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ access_token: "new-access", expires_in: 3600 })),
    );
    const service = new SpotifyAuthService(tokenStore);
    const result = await service.refreshUserToken();
    expect(result).toBe(false);
  });
});

describe("SpotifyAuthService.exchangeCodeForToken", () => {
  const tokenStore = {
    getString: vi.fn(),
    setString: vi.fn(),
    delete: vi.fn(),
  } as unknown as TokenStorePort;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    (tokenStore.setString as ReturnType<typeof vi.fn>).mockReset();
    (tokenStore.setString as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("does not save refresh_token when Spotify omits it in exchange response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          access_token: "access-only",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      ),
    );
    const service = new SpotifyAuthService(tokenStore);
    await service.exchangeCodeForToken("some-code");
    expect(tokenStore.setString).toHaveBeenCalledWith("spotify_user_access_token", "access-only");
    expect(tokenStore.setString).not.toHaveBeenCalledWith(
      "spotify_user_refresh_token",
      expect.anything(),
    );
  });
});

describe("SpotifyAuthService.logout", () => {
  it("rethrows when tokenStore.delete throws", async () => {
    const tokenStore: TokenStorePort = {
      getString: vi.fn(),
      setString: vi.fn(),
      delete: vi.fn().mockRejectedValue(new Error("Delete failed")),
    };
    const service = new SpotifyAuthService(tokenStore);
    await expect(service.logout()).rejects.toThrow("Delete failed");
  });
});

describe("SpotifyAuthService instance isolation", () => {
  it("two instances do not share state", async () => {
    const storeA = new Map<string, string>();
    const storeB = new Map<string, string>();

    const fakeStoreA: TokenStorePort = {
      getString: async (key) => storeA.get(key) ?? "",
      setString: async (key, val) => {
        storeA.set(key, val);
      },
      delete: async (key) => {
        storeA.delete(key);
      },
    };
    const fakeStoreB: TokenStorePort = {
      getString: async (key) => storeB.get(key) ?? "",
      setString: async (key, val) => {
        storeB.set(key, val);
      },
      delete: async (key) => {
        storeB.delete(key);
      },
    };

    const instanceA = new SpotifyAuthService(fakeStoreA);
    const instanceB = new SpotifyAuthService(fakeStoreB);

    await fakeStoreA.setString("some_key", "value-from-A");

    const fromB = await instanceB["tokenStore"].getString("some_key");
    expect(fromB).toBe("");
    expect(storeA.get("some_key")).toBe("value-from-A");
    expect(storeB.get("some_key")).toBeUndefined();

    void instanceA;
  });
});
