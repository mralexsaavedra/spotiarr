import { Router, type Router as ExpressRouter } from "express";
import { PrismaSettingsRepository } from "../../infrastructure/database/prisma-settings.repository";
import { getEnv } from "../../infrastructure/setup/environment";
import { asyncHandler } from "../middleware/async-handler";

const router: ExpressRouter = Router();
const settingsRepository = new PrismaSettingsRepository();
const SCOPES = ["user-follow-read", "playlist-read-private", "playlist-read-collaborative"].join(
  " ",
);

// GET /api/auth/spotify/login - Redirect user to Spotify authorization page
router.get(
  "/spotify/login",
  asyncHandler(async (_req, res) => {
    const env = getEnv();
    const clientId = env.SPOTIFY_CLIENT_ID;
    const redirectUri = env.SPOTIFY_REDIRECT_URI;

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: SCOPES,
    });

    const url = `https://accounts.spotify.com/authorize?${params.toString()}`;

    res.redirect(url);
  }),
);

// GET /api/auth/spotify/callback - Handle Spotify authorization callback
router.get(
  "/spotify/callback",
  asyncHandler(async (req, res) => {
    const code = req.query.code as string | undefined;

    if (!code) {
      return res.status(400).json({
        error: "missing_code",
        message: "Authorization code is missing from Spotify callback",
      });
    }

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
      console.error("Spotify token exchange failed", errorText);
      return res.status(500).json({
        error: "spotify_token_exchange_failed",
        message: "Failed to exchange authorization code for access token",
      });
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope?: string;
      token_type: string;
    };

    await settingsRepository.set("spotify_user_access_token", data.access_token);

    if (data.refresh_token) {
      await settingsRepository.set("spotify_user_refresh_token", data.refresh_token);
    }

    // TODO: could store expiry if needed; for now we rely on manual refresh or future improvements

    res.redirect("/");
  }),
);

// GET /api/auth/spotify/status - Check if user is authenticated with Spotify
router.get(
  "/spotify/status",
  asyncHandler(async (_req, res) => {
    try {
      const accessToken = await settingsRepository.get("spotify_user_access_token");
      const refreshToken = await settingsRepository.get("spotify_user_refresh_token");

      res.json({
        authenticated: !!accessToken,
        hasRefreshToken: !!refreshToken,
      });
    } catch {
      res.json({
        authenticated: false,
        hasRefreshToken: false,
      });
    }
  }),
);

// POST /api/auth/spotify/logout - Clear Spotify user tokens
router.post(
  "/spotify/logout",
  asyncHandler(async (_req, res) => {
    try {
      await settingsRepository.delete("spotify_user_access_token");
      await settingsRepository.delete("spotify_user_refresh_token");

      res.json({
        success: true,
        message: "Successfully logged out from Spotify",
      });
    } catch (error) {
      console.error("Failed to logout from Spotify", error);
      res.status(500).json({
        success: false,
        error: "logout_failed",
        message: "Failed to clear Spotify authentication",
      });
    }
  }),
);

export default router;
