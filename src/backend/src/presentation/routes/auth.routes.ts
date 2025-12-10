import { Router, type Router as ExpressRouter } from "express";
import { container } from "@/container";
import { getEnv } from "@/infrastructure/setup/environment";
import { asyncHandler } from "../middleware/async-handler";

const router: ExpressRouter = Router();
const { spotifyAuthService, settingsService } = container;
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

    try {
      await spotifyAuthService.exchangeCodeForToken(code);
      res.redirect("/");
    } catch (error) {
      console.error("Spotify token exchange failed", error);
      res.status(500).json({
        error: "spotify_token_exchange_failed",
        message: "Failed to exchange authorization code for access token",
      });
    }
  }),
);

// GET /api/auth/spotify/status - Check if user is authenticated with Spotify
router.get(
  "/spotify/status",
  asyncHandler(async (_req, res) => {
    try {
      const accessToken = await settingsService.getString("spotify_user_access_token");
      const refreshToken = await settingsService.getString("spotify_user_refresh_token");

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
      await spotifyAuthService.logout();

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
