import type { TokenStorePort } from "@/application/ports/token-store.port";
import { AppError } from "@/domain/errors/app-error";
import { logger } from "@/infrastructure/logging/logger";
import { getErrorMessage } from "../../application/utils/error.utils";
import { getEnv } from "../setup/environment";

interface SpotifyTokenResponse {
  access_token: string;
  expires_in: number;
}

export class SpotifyAuthService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private appTokenPromise: Promise<string> | null = null;

  constructor(
    private readonly tokenStore: TokenStorePort,
    private readonly invalidateUserLibraryCache: () => void = () => {},
  ) {}

  private log(message: string, level: "debug" | "error" | "warn" = "debug") {
    if (level === "error") logger.error({ component: "spotify-auth" }, message);
    else if (level === "warn") logger.warn({ component: "spotify-auth" }, message);
    else logger.debug({ component: "spotify-auth" }, message);
  }

  async getAppToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (this.appTokenPromise) {
      return this.appTokenPromise;
    }

    this.appTokenPromise = (async () => {
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
        const responseBody = await response.text();
        logger.error(
          { component: "spotify-auth", status: response.status, responseBody },
          "Failed to get access token",
        );
        throw new AppError(500, "internal_server_error", "Failed to get access token");
      }

      const data = (await response.json()) as SpotifyTokenResponse;
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60000;

      this.log("Successfully obtained Spotify access token");
      return this.accessToken as string;
    })();

    try {
      return await this.appTokenPromise;
    } catch (error) {
      logger.debug(
        { component: "spotify-auth", err: getErrorMessage(error) },
        "Error getting Spotify access token",
      );
      throw error;
    } finally {
      this.appTokenPromise = null;
    }
  }

  async getUserToken(): Promise<string> {
    const accessTokenKey = "spotify_user_access_token";

    // Check settings first (database persistence)
    let fromSettings: string | undefined;
    try {
      fromSettings = await this.tokenStore.getString(accessTokenKey);
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

      const refreshToken = await this.tokenStore.getString(refreshTokenKey);
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
        logger.warn(
          { component: "spotify-auth", status: response.status, responseBody: errorText },
          "Failed to refresh Spotify user token",
        );
        return false;
      }

      const data = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type?: string;
        scope?: string;
      };

      await this.tokenStore.setString(accessTokenKey, data.access_token);

      if (data.refresh_token) {
        await this.tokenStore.setString(refreshTokenKey, data.refresh_token);
      }

      this.invalidateUserLibraryCache();

      this.log("Successfully refreshed Spotify user access token");
      return true;
    } catch (error) {
      logger.warn(
        { component: "spotify-auth", err: getErrorMessage(error) },
        "Error refreshing Spotify user token",
      );
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
      logger.error(
        { component: "spotify-auth", status: response.status, responseBody: errorText },
        "Spotify token exchange failed",
      );
      throw new AppError(
        500,
        "spotify_token_exchange_failed",
        "Failed to exchange authorization code for access token",
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope?: string;
      token_type: string;
    };

    await this.tokenStore.setString("spotify_user_access_token", data.access_token);

    if (data.refresh_token) {
      await this.tokenStore.setString("spotify_user_refresh_token", data.refresh_token);
    }

    this.invalidateUserLibraryCache();
  }

  async logout(): Promise<void> {
    try {
      await this.tokenStore.delete("spotify_user_access_token");
      await this.tokenStore.delete("spotify_user_refresh_token");
      this.invalidateUserLibraryCache();
      this.log("Successfully logged out from Spotify");
    } catch (error) {
      logger.error(
        { component: "spotify-auth", err: getErrorMessage(error) },
        "Failed to logout from Spotify",
      );
      throw error;
    }
  }
}
