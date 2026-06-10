import { createHash, timingSafeEqual } from "crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import type { SettingsService } from "@/application/services/settings.service";
import { COOKIE_NAME, signCookie } from "../middleware/cookie";

interface SpotifyAuthPort {
  exchangeCodeForToken(code: string): Promise<void>;
  logout(): Promise<void>;
}

const SCOPES = [
  "user-read-private",
  "user-follow-read",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

const unlockBodySchema = z.object({
  token: z.string().min(1),
});

export class AuthController {
  constructor(
    private readonly spotifyAuthService: SpotifyAuthPort,
    private readonly settingsService: SettingsService,
    private readonly spotifyClientId: string,
    private readonly spotifyRedirectUri: string,
    private readonly spotiarrToken: string | undefined,
    private readonly sessionTtlHours: number,
  ) {}

  login = async (_req: Request, res: Response) => {
    const params = new URLSearchParams({
      client_id: this.spotifyClientId,
      response_type: "code",
      redirect_uri: this.spotifyRedirectUri,
      scope: SCOPES,
      show_dialog: "true",
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

  unlock = (req: Request, res: Response): void => {
    const token = this.spotiarrToken;

    if (!token) {
      res.status(200).json({ ok: true });
      return;
    }

    const parsed = unlockBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(401).json({ error: "invalid_token" });
      return;
    }

    const submittedToken = parsed.data.token;
    const digest = (s: string) => createHash("sha256").update(s, "utf8").digest();
    const match = timingSafeEqual(digest(token), digest(submittedToken));

    if (!match) {
      res.status(401).json({ error: "invalid_token" });
      return;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const ttlSeconds = this.sessionTtlHours * 3600;
    const payload = { iat: nowSeconds, exp: nowSeconds + ttlSeconds };
    const cookieValue = signCookie(payload, token);

    const isSecure = req.secure;

    res.cookie(COOKIE_NAME, cookieValue, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: ttlSeconds * 1000,
    });

    res.status(200).json({ ok: true });
  };

  session = (_req: Request, res: Response): void => {
    const token = this.spotiarrToken;

    if (!token) {
      res.status(200).json({ tokenRequired: false });
      return;
    }

    res.status(200).json({ tokenRequired: true });
  };
}
