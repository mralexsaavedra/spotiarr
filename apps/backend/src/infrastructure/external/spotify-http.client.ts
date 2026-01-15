import { SpotifyAuthService } from "./spotify-auth.service";

export class SpotifyHttpClient {
  constructor(private readonly authService: SpotifyAuthService) {}

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchWithRateLimitRetry(
    input: string | URL,
    init?: RequestInit,
    retries = 0,
  ): Promise<Response> {
    const MAX_RETRIES = 5;
    try {
      const response = await fetch(input.toString(), init);

      if (response.status === 429 && retries < MAX_RETRIES) {
        const retryAfterHeader = response.headers.get("Retry-After");
        // Default to 2^retries seconds if header is missing, or use header value
        const retryAfterSeconds = retryAfterHeader
          ? parseInt(retryAfterHeader, 10)
          : Math.pow(2, retries);

        // Add 1s buffer to be safe
        const waitMs = (retryAfterSeconds + 1) * 1000;

        console.warn(
          `[SpotifyHttpClient] Rate limited (429). Waiting ${waitMs}ms before retry ${retries + 1}/${MAX_RETRIES}`,
        );

        await this.sleep(waitMs);
        // Recursively retry
        return this.fetchWithRateLimitRetry(input, init, retries + 1);
      }

      return response;
    } catch (error: any) {
      const isNetworkError =
        error.message?.includes("fetch failed") ||
        error.cause?.code === "ETIMEDOUT" ||
        error.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ||
        error.cause?.code === "ECONNRESET";

      if (isNetworkError && retries < MAX_RETRIES) {
        const waitMs = Math.pow(2, retries) * 2000; // Exponential backoff: 0s->2s, 1s->4s, 2s->8s...
        console.warn(
          `[SpotifyHttpClient] Network error (${error.message}). Retrying in ${waitMs}ms (${retries + 1}/${MAX_RETRIES})`,
        );
        await this.sleep(waitMs);
        return this.fetchWithRateLimitRetry(input, init, retries + 1);
      }

      throw error;
    }
  }

  /**
   * Perform a fetch using the Spotify application access token.
   */
  async fetchWithAppToken(input: string | URL, init?: RequestInit): Promise<Response> {
    const token = await this.authService.getAppToken();
    const headers = {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    } as Record<string, string>;

    return this.fetchWithRateLimitRetry(input, {
      ...init,
      headers,
    });
  }

  /**
   * Perform a fetch using the Spotify user access token, automatically
   * attempting a single refresh on 401 responses.
   */
  async fetchWithUserToken(input: string | URL, init?: RequestInit): Promise<Response> {
    const makeRequest = async (token: string): Promise<Response> => {
      const headers = {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      } as Record<string, string>;

      return this.fetchWithRateLimitRetry(input, {
        ...init,
        headers,
      });
    };

    // First attempt with current token
    const initialToken = await this.authService.getUserToken();
    const response = await makeRequest(initialToken);

    if (response.status !== 401) {
      return response;
    }

    // Try to refresh the token once
    const refreshed = await this.authService.refreshUserToken();
    if (!refreshed) {
      return response;
    }

    // Retry with new token
    const newToken = await this.authService.getUserToken();
    return makeRequest(newToken);
  }
}
