import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { PrismaSettingsRepository } from "../repositories/prisma-settings.repository";

const router: ExpressRouter = Router();
const settingsRepository = new PrismaSettingsRepository();
const SCOPES = ["user-follow-read"].join(" ");

// GET /api/auth/spotify/login - Redirect user to Spotify authorization page
router.get(
  "/spotify/login",
  asyncHandler(async (_req, res) => {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri =
      process.env.SPOTIFY_REDIRECT_URI || "http://localhost:3000/api/auth/spotify/callback";

    if (!clientId) {
      return res.status(500).json({
        error: "missing_spotify_client_id",
        message: "Spotify client ID is not configured",
      });
    }

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

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri =
      process.env.SPOTIFY_REDIRECT_URI || "http://localhost:3000/api/auth/spotify/callback";

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: "missing_spotify_credentials",
        message: "Spotify client credentials are not configured",
      });
    }

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

export default router;
