import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import { validateEnvironment } from "@/infrastructure/setup/environment";
import { CircuitBreaker } from "./circuit-breaker";
import { RateLimiter } from "./rate-limiter";
import { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyHttpClient } from "./spotify-http.client";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

beforeAll(() => {
  process.env.SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID ?? "test-client-id";
  process.env.SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET ?? "test-client-secret";
  process.env.SPOTIFY_REDIRECT_URI =
    process.env.SPOTIFY_REDIRECT_URI ?? "http://localhost:3000/auth/spotify/callback";
  validateEnvironment();
});

describe("SpotifyHttpClient", () => {
  let authService: SpotifyAuthService;
  let client: SpotifyHttpClient;

  beforeEach(() => {
    authService = {
      getAppToken: vi.fn().mockResolvedValue("test-app-token"),
      getUserToken: vi.fn().mockResolvedValue("test-user-token"),
      refreshUserToken: vi.fn().mockResolvedValue(false),
    } as unknown as SpotifyAuthService;

    const circuitBreaker = new CircuitBreaker();
    const rateLimiter = new RateLimiter({
      maxConcurrency: 5,
      minIntervalMs: 0,
      queueTimeoutMs: 5000,
    });
    client = new SpotifyHttpClient(authService, circuitBreaker, rateLimiter, "user");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("fetchWithAppToken()", () => {
    it("adds Authorization header with Bearer app token", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 200));
      vi.stubGlobal("fetch", fetchMock);

      await client.fetchWithAppToken("https://api.spotify.com/v1/test");

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Authorization"]).toBe(
        "Bearer test-app-token",
      );
    });

    it("passes through a 200 response", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ ok: true }, 200)));

      const response = await client.fetchWithAppToken("https://api.spotify.com/v1/test");

      expect(response.status).toBe(200);
    });

    it("throws AppError(429) when Spotify rate-limits via circuit breaker", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response("", {
            status: 429,
            headers: { "Retry-After": "1" },
          }),
        ),
      );

      await expect(
        client.fetchWithAppToken("https://api.spotify.com/v1/test"),
      ).rejects.toMatchObject({
        statusCode: 429,
        errorCode: "spotify_rate_limited",
      });
    });
  });

  describe("fetchWithUserToken()", () => {
    it("adds Authorization header with Bearer user token", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 200));
      vi.stubGlobal("fetch", fetchMock);

      await client.fetchWithUserToken("https://api.spotify.com/v1/me");

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Authorization"]).toBe(
        "Bearer test-user-token",
      );
    });

    it("refreshes token on 401 and retries with the new token", async () => {
      (authService.refreshUserToken as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (authService.getUserToken as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce("test-user-token")
        .mockResolvedValueOnce("new-user-token");

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response("", { status: 401 }))
        .mockResolvedValueOnce(jsonResponse({}, 200));
      vi.stubGlobal("fetch", fetchMock);

      const response = await client.fetchWithUserToken("https://api.spotify.com/v1/me");

      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const [, secondInit] = fetchMock.mock.calls[1] as [string, RequestInit];
      expect((secondInit.headers as Record<string, string>)["Authorization"]).toBe(
        "Bearer new-user-token",
      );
    });

    it("returns original 401 response when refreshUserToken returns false", async () => {
      (authService.refreshUserToken as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 401 })));

      const response = await client.fetchWithUserToken("https://api.spotify.com/v1/me");

      expect(response.status).toBe(401);
    });

    it("does not retry on non-401 errors and returns response directly", async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 404 }));
      vi.stubGlobal("fetch", fetchMock);

      const response = await client.fetchWithUserToken("https://api.spotify.com/v1/me");

      expect(response.status).toBe(404);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
