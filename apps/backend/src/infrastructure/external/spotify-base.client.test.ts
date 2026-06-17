import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { SettingsPort } from "@/application/ports/settings.port";
import { validateEnvironment } from "@/infrastructure/setup/environment";
import { CircuitBreaker } from "./circuit-breaker";
import { RateLimiter } from "./rate-limiter";
import { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyBaseClient } from "./spotify-base.client";

const loggerMock = vi.hoisted(() => {
  const mock = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  };
  mock.child.mockReturnValue(mock);
  return mock;
});
vi.mock("@/infrastructure/logging/logger", () => ({ logger: loggerMock }));

beforeAll(() => {
  process.env.SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID ?? "test-client-id";
  process.env.SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET ?? "test-client-secret";
  process.env.SPOTIFY_REDIRECT_URI =
    process.env.SPOTIFY_REDIRECT_URI ?? "http://localhost:3000/auth/spotify/callback";
  validateEnvironment();
});

class TestableBase extends SpotifyBaseClient {
  public callGetMarket(): Promise<string> {
    return this.getMarket();
  }
  public callClearMarketCache(): void {
    this.clearMarketCache();
  }
  public callLog(msg: string, level?: "debug" | "error" | "warn"): void {
    this.log(msg, level);
  }
}

describe("SpotifyBaseClient", () => {
  let authService: SpotifyAuthService;
  let settingsService: { getString: ReturnType<typeof vi.fn> } & SettingsPort;
  let circuitBreaker: CircuitBreaker;
  let rateLimiter: RateLimiter;
  let base: TestableBase;

  beforeEach(() => {
    authService = {
      getAppToken: vi.fn().mockResolvedValue("test-app-token"),
      getUserToken: vi.fn().mockResolvedValue("test-user-token"),
      refreshUserToken: vi.fn().mockResolvedValue(false),
    } as unknown as SpotifyAuthService;

    settingsService = {
      getString: vi.fn(),
    } as unknown as { getString: ReturnType<typeof vi.fn> } & SettingsPort;

    circuitBreaker = new CircuitBreaker();
    rateLimiter = new RateLimiter({ maxConcurrency: 5, minIntervalMs: 0, queueTimeoutMs: 5000 });
    base = new TestableBase(authService, settingsService, "TestCtx", circuitBreaker, rateLimiter);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("getMarket()", () => {
    it("calls settingsService.getString with SPOTIFY_MARKET and returns the value", async () => {
      (settingsService.getString as ReturnType<typeof vi.fn>).mockResolvedValue("US");

      const result = await base.callGetMarket();

      expect(settingsService.getString).toHaveBeenCalledWith("SPOTIFY_MARKET");
      expect(result).toBe("US");
    });

    it("returns 'ES' as fallback when getString throws", async () => {
      (settingsService.getString as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Setting not found"),
      );

      const result = await base.callGetMarket();

      expect(result).toBe("ES");
    });

    it("caches the market and only calls getString once on repeated calls", async () => {
      (settingsService.getString as ReturnType<typeof vi.fn>).mockResolvedValue("DE");

      const first = await base.callGetMarket();
      const second = await base.callGetMarket();
      const third = await base.callGetMarket();

      expect(first).toBe("DE");
      expect(second).toBe("DE");
      expect(third).toBe("DE");
      expect(settingsService.getString).toHaveBeenCalledTimes(1);
    });

    it("re-fetches from settingsService after clearMarketCache()", async () => {
      (settingsService.getString as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce("FR")
        .mockResolvedValueOnce("JP");

      const first = await base.callGetMarket();
      expect(first).toBe("FR");

      base.callClearMarketCache();

      const second = await base.callGetMarket();
      expect(second).toBe("JP");
      expect(settingsService.getString).toHaveBeenCalledTimes(2);
    });
  });

  describe("log()", () => {
    beforeEach(() => {
      loggerMock.error.mockClear();
      loggerMock.warn.mockClear();
      loggerMock.debug.mockClear();
      loggerMock.info.mockClear();
    });

    it("calls logger.error on 'error' level", () => {
      base.callLog("something went wrong", "error");

      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.objectContaining({ context: "TestCtx" }),
        "something went wrong",
      );
    });

    it("calls logger.warn on 'warn' level", () => {
      base.callLog("heads up", "warn");

      expect(loggerMock.warn).toHaveBeenCalledWith(
        expect.objectContaining({ context: "TestCtx" }),
        "heads up",
      );
    });

    it("calls logger.debug for 'debug' level", () => {
      base.callLog("debug message", "debug");

      expect(loggerMock.debug).toHaveBeenCalledWith(
        expect.objectContaining({ context: "TestCtx" }),
        "debug message",
      );
    });

    it("defaults to 'debug' level when no level is provided", () => {
      base.callLog("implicit debug");

      expect(loggerMock.debug).toHaveBeenCalledWith(
        expect.objectContaining({ context: "TestCtx" }),
        "implicit debug",
      );
      expect(loggerMock.error).not.toHaveBeenCalled();
      expect(loggerMock.warn).not.toHaveBeenCalled();
    });
  });
});
