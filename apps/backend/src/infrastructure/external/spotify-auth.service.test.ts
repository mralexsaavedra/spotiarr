import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SettingsService } from "@/application/services/settings.service";
import { AppError } from "@/domain/errors/app-error";
import { validateEnvironment } from "@/infrastructure/setup/environment";
import { SpotifyAuthService } from "./spotify-auth.service";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const textResponse = (body: string, status = 500) => new Response(body, { status });

beforeAll(() => {
  process.env.SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID ?? "test-client-id";
  process.env.SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET ?? "test-client-secret";
  process.env.SPOTIFY_REDIRECT_URI =
    process.env.SPOTIFY_REDIRECT_URI ?? "http://localhost:3000/auth/spotify/callback";
  validateEnvironment();
});

describe("SpotifyAuthService invalidation", () => {
  const invalidateUserLibraryCache = vi.fn();
  const settingsService = {
    getString: vi.fn(),
    setString: vi.fn(),
    delete: vi.fn(),
  } as unknown as SettingsService;

  let service: SpotifyAuthService;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    invalidateUserLibraryCache.mockReset();

    (settingsService.getString as ReturnType<typeof vi.fn>).mockReset();
    (settingsService.setString as ReturnType<typeof vi.fn>).mockReset();
    (settingsService.delete as ReturnType<typeof vi.fn>).mockReset();

    service = new SpotifyAuthService(settingsService, invalidateUserLibraryCache);
  });

  it("calls invalidator after successful token exchange", async () => {
    (settingsService.setString as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      ),
    );

    await service.exchangeCodeForToken("auth-code");

    expect(settingsService.setString).toHaveBeenCalledWith(
      "spotify_user_access_token",
      "new-access-token",
    );
    expect(settingsService.setString).toHaveBeenCalledWith(
      "spotify_user_refresh_token",
      "new-refresh-token",
    );
    expect(invalidateUserLibraryCache).toHaveBeenCalledTimes(1);
  });

  it("calls invalidator after successful refresh", async () => {
    (settingsService.getString as ReturnType<typeof vi.fn>).mockResolvedValue("refresh-token");
    (settingsService.setString as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          access_token: "refreshed-access-token",
          refresh_token: "refreshed-refresh-token",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      ),
    );

    const refreshed = await service.refreshUserToken();

    expect(refreshed).toBe(true);
    expect(invalidateUserLibraryCache).toHaveBeenCalledTimes(1);
  });

  it("calls invalidator after successful logout", async () => {
    (settingsService.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await service.logout();

    expect(settingsService.delete).toHaveBeenCalledWith("spotify_user_access_token");
    expect(settingsService.delete).toHaveBeenCalledWith("spotify_user_refresh_token");
    expect(invalidateUserLibraryCache).toHaveBeenCalledTimes(1);
  });

  it("does not call invalidator when token exchange fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => textResponse("bad request", 400)),
    );

    await expect(service.exchangeCodeForToken("bad-code")).rejects.toBeInstanceOf(AppError);
    expect(invalidateUserLibraryCache).not.toHaveBeenCalled();
  });
});
