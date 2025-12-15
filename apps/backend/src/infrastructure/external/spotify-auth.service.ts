import { SettingsService } from "@/application/services/settings.service";
import { AppError } from "@/domain/errors/app-error";
import { getEnv } from "../setup/environment";
import { getErrorMessage } from "../utils/error.utils";

interface SpotifyTokenResponse {
  access_token: string;
  expires_in: number;
}

export class SpotifyAuthService {
  private static instance: SpotifyAuthService | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private readonly settingsService: SettingsService) {}

  static getInstance(settingsService: SettingsService): SpotifyAuthService {
    if (!SpotifyAuthService.instance) {
      SpotifyAuthService.instance = new SpotifyAuthService(settingsService);
    }
    return SpotifyAuthService.instance;
  }

  private log(message: string, level: "debug" | "error" | "warn" = "debug") {
    const prefix = `[SpotifyAuthService]`;
    if (level === "error") console.error(prefix, message);
    else if (level === "warn") console.warn(prefix, message);
    else if (getEnv().NODE_ENV === "development") console.log(prefix, message);
  }

  async getAppToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      this.log("Getting new Spotify access token");

      const env = getEnv();
      const clientId = env.SPOTIFY_CLIENT_ID;
      const clientSecret = env.SPOTIFY_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new AppError(
          500,
          "missing_spotify_credentials",
          "Missing Spotify credentials. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env file",
        );
      }

      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new AppError(
          500,
          "internal_server_error",
          `Failed to get access token: ${errorData}`,
        );
      }

      const data = (await response.json()) as SpotifyTokenResponse;
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60000;

      this.log("Successfully obtained Spotify access token");
      return this.accessToken as string;
    } catch (error) {
      this.log(`Error getting Spotify access token: ${getErrorMessage(error)}`);
      throw error;
    }
  }

  async getUserToken(): Promise<string> {
    const accessTokenKey = "spotify_user_access_token";

    // Check settings first (database persistence)
    let fromSettings: string | undefined;
    try {
      fromSettings = await this.settingsService.getString(accessTokenKey);
    } catch {
      fromSettings = undefined;
    }

    // Fallback to env var
    const token = fromSettings;

    if (!token) {
      throw new AppError(
        401,
        "missing_user_access_token",
        `Missing Spotify user access token. Please login via the Web UI.`,
      );
    }

    return token;
  }

  async refreshUserToken(): Promise<boolean> {
    try {
      const refreshTokenKey = "spotify_user_refresh_token";
      const accessTokenKey = "spotify_user_access_token";

      const refreshToken = await this.settingsService.getString(refreshTokenKey);
      if (!refreshToken) {
        this.log("No Spotify user refresh token available to refresh access token", "warn");
        return false;
      }

      const env = getEnv();
      const clientId = env.SPOTIFY_CLIENT_ID;
      const clientSecret = env.SPOTIFY_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        this.log(
          "Missing Spotify client credentials for user token refresh. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.",
          "warn",
        );
        return false;
      }

      const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      });

      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.log(`Failed to refresh Spotify user token: ${response.status} ${errorText}`, "warn");
        return false;
      }

      const data = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type?: string;
        scope?: string;
      };

      await this.settingsService.setString(accessTokenKey, data.access_token);

      if (data.refresh_token) {
        await this.settingsService.setString(refreshTokenKey, data.refresh_token);
      }

      this.log("Successfully refreshed Spotify user access token");
      return true;
    } catch (error) {
      this.log(`Error refreshing Spotify user token: ${getErrorMessage(error)}`, "warn");
      return false;
    }
  }

  async exchangeCodeForToken(code: string): Promise<void> {
    const env = getEnv();
    const clientId = env.SPOTIFY_CLIENT_ID;
    const clientSecret = env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = env.SPOTIFY_REDIRECT_URI;

    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenBody.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.log(`Spotify token exchange failed: ${errorText}`, "error");
      throw new AppError(
        500,
        "spotify_token_exchange_failed",
        `Failed to exchange authorization code for access token: ${errorText}`,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope?: string;
      token_type: string;
    };

    await this.settingsService.setString("spotify_user_access_token", data.access_token);

    if (data.refresh_token) {
      await this.settingsService.setString("spotify_user_refresh_token", data.refresh_token);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.settingsService.delete("spotify_user_access_token");
      await this.settingsService.delete("spotify_user_refresh_token");
      this.log("Successfully logged out from Spotify");
    } catch (error) {
      this.log(`Failed to logout from Spotify: ${getErrorMessage(error)}`, "error");
      throw error;
    }
  }
}
