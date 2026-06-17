import type { SettingsPort } from "@/application/ports/settings.port";
import { logger } from "@/infrastructure/logging/logger";
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
    appTokenCircuitBreaker: CircuitBreaker,
    appTokenRateLimiter: RateLimiter,
    limiterMode: SpotifyLimiterMode = "interactive",
  ) {
    super(authService, appTokenCircuitBreaker, appTokenRateLimiter, limiterMode);
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
    if (level === "error") logger.error({ context: this.contextName }, message);
    else if (level === "warn") logger.warn({ context: this.contextName }, message);
    else logger.debug({ context: this.contextName }, message);
  }
}
