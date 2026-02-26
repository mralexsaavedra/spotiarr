import { Request, Response } from "express";
import { SettingsService } from "@/application/services/settings.service";
import { SpotifyAuthService } from "@/infrastructure/external/spotify-auth.service";
import { getEnv } from "@/infrastructure/setup/environment";

const SCOPES = ["user-follow-read", "playlist-read-private", "playlist-read-collaborative"].join(
  " ",
);

export class AuthController {
  constructor(
    private readonly spotifyAuthService: SpotifyAuthService,
    private readonly settingsService: SettingsService,
  ) {}

  login = async (_req: Request, res: Response) => {
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
  };

  callback = async (req: Request, res: Response) => {
    const code = req.query.code as string | undefined;

    if (!code) {
      return res.status(400).json({
        error: "missing_code",
        message: "Authorization code is missing from Spotify callback",
      });
    }

    await this.spotifyAuthService.exchangeCodeForToken(code);
    res.redirect("/");
  };

  status = async (_req: Request, res: Response) => {
    try {
      const accessToken = await this.settingsService.getString("spotify_user_access_token");
      const refreshToken = await this.settingsService.getString("spotify_user_refresh_token");

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
  };

  logout = async (_req: Request, res: Response) => {
    await this.spotifyAuthService.logout();
    res.json({
      success: true,
      message: "Successfully logged out from Spotify",
    });
  };
}
