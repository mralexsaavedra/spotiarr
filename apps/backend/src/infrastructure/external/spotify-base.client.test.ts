import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { SettingsPort } from "@/application/ports/settings.port";
import { validateEnvironment } from "@/infrastructure/setup/environment";
import { CircuitBreaker } from "./circuit-breaker";
import { RateLimiter } from "./rate-limiter";
import { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyBaseClient } from "./spotify-base.client";

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
    it("calls console.error on 'error' level", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      base.callLog("something went wrong", "error");

      expect(spy).toHaveBeenCalledWith("[TestCtx]", "something went wrong");
    });

    it("calls console.warn on 'warn' level", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

      base.callLog("heads up", "warn");

      expect(spy).toHaveBeenCalledWith("[TestCtx]", "heads up");
    });

    it("does not call console.log for 'debug' level when NODE_ENV is not 'development'", () => {
      // getEnv() returns the validated env captured at validateEnvironment() time.
      // In the test environment NODE_ENV is typically "test", so console.log is never called.
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});

      base.callLog("debug message", "debug");

      // Characterization: log is suppressed unless NODE_ENV === "development"
      // We cannot guarantee NODE_ENV during tests, so we assert the actual behavior.
      const nodeEnv = process.env.NODE_ENV;
      if (nodeEnv !== "development") {
        expect(spy).not.toHaveBeenCalled();
      } else {
        expect(spy).toHaveBeenCalledWith("[TestCtx]", "debug message");
      }
    });

    it("defaults to 'debug' level when no level is provided", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      base.callLog("implicit debug");

      // Neither error nor warn should be called for the default level
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      // console.log may or may not be called depending on NODE_ENV — no assertion needed
      consoleSpy.mockRestore();
    });
  });
});
