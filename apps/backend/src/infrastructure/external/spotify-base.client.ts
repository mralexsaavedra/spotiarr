import type { SettingsPort } from "@/application/ports/settings.port";
import { getEnv } from "../setup/environment";
import { CircuitBreaker } from "./circuit-breaker";
import { RateLimiter } from "./rate-limiter";
import { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyHttpClient, type SpotifyLimiterMode } from "./spotify-http.client";

export abstract class SpotifyBaseClient extends SpotifyHttpClient {
  private cachedMarket: string | null = null;

  constructor(
    authService: SpotifyAuthService,
    protected readonly settingsService: SettingsPort,
    private readonly contextName: string,
    limiterMode: SpotifyLimiterMode = "interactive",
    appTokenCircuitBreaker?: CircuitBreaker,
    appTokenRateLimiter?: RateLimiter,
  ) {
    super(authService, limiterMode, undefined, appTokenCircuitBreaker, appTokenRateLimiter);
  }

  protected async getMarket(): Promise<string> {
    if (this.cachedMarket) return this.cachedMarket;
    try {
      this.cachedMarket = await this.settingsService.getString("SPOTIFY_MARKET");
      return this.cachedMarket;
    } catch {
      return "ES"; // Fallback to ES if setting not found
    }
  }

  clearMarketCache(): void {
    this.cachedMarket = null;
  }

  protected log(message: string, level: "debug" | "error" | "warn" = "debug") {
    const prefix = `[${this.contextName}]`;
    if (level === "error") console.error(prefix, message);
    else if (level === "warn") console.warn(prefix, message);
    else if (getEnv().NODE_ENV === "development") console.log(prefix, message);
  }
}
