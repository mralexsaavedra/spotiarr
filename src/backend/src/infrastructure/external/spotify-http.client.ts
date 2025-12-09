import { SpotifyAuthService } from "./spotify-auth.service";

export class SpotifyHttpClient {
  constructor(private readonly authService: SpotifyAuthService) {}

  /**
   * Perform a fetch using the Spotify application access token.
   */
  async fetchWithAppToken(input: string | URL, init?: RequestInit): Promise<Response> {
    const token = await this.authService.getAppToken();
    const headers = {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    } as Record<string, string>;

    return fetch(input.toString(), {
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

      return fetch(input.toString(), {
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
