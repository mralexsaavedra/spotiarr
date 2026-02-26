import { SettingsService } from "@/application/services/settings.service";
import { getEnv } from "../setup/environment";
import { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyHttpClient } from "./spotify-http.client";

export abstract class SpotifyBaseClient extends SpotifyHttpClient {
  constructor(
    authService: SpotifyAuthService,
    protected readonly settingsService: SettingsService,
    private readonly contextName: string,
  ) {
    super(authService);
  }

  protected async getMarket(): Promise<string> {
    try {
      return await this.settingsService.getString("SPOTIFY_MARKET");
    } catch {
      return "ES"; // Fallback to ES if setting not found
    }
  }

  protected log(message: string, level: "debug" | "error" | "warn" = "debug") {
    const prefix = `[${this.contextName}]`;
    if (level === "error") console.error(prefix, message);
    else if (level === "warn") console.warn(prefix, message);
    else if (getEnv().NODE_ENV === "development") console.log(prefix, message);
  }
}
