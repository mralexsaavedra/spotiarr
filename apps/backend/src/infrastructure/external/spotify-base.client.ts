import { SettingsService } from "@/application/services/settings.service";
import { getEnv } from "../setup/environment";
import { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyHttpClient, type SpotifyLimiterMode } from "./spotify-http.client";

export abstract class SpotifyBaseClient extends SpotifyHttpClient {
  private cachedMarket: string | null = null;

  constructor(
    authService: SpotifyAuthService,
    protected readonly settingsService: SettingsService,
    private readonly contextName: string,
    limiterMode: SpotifyLimiterMode = "interactive",
  ) {
    super(authService, limiterMode);
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
