import { ApiErrorCode, ApiErrorShape, ApiRoutes } from "@spotiarr/shared";

export class HttpClient {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const text = await response.text();
    const data = text ? (JSON.parse(text) as unknown) : undefined;

    if (!response.ok) {
      let errorCode: ApiErrorCode | undefined;
      let message: string | undefined;

      if (typeof data === "object" && data !== null && "error" in data) {
        const shape = data as ApiErrorShape;
        errorCode = shape.error;
        message = shape.message;
      }

      // Global error handling for common Spotify errors
      if (errorCode === "missing_user_access_token") {
        throw new Error("missing_user_access_token");
      }

      if (errorCode === "spotify_rate_limited") {
        throw new Error("spotify_rate_limited");
      }

      // Specific error handling can be done by the caller if they catch the error,
      // but we throw a structured error or a standard Error with the message.
      // For now, we replicate the existing behavior of throwing Errors with specific messages or codes.

      if (errorCode) {
        // If we have a specific error code, we might want to throw that as the message
        // so callers can check `error.message === 'invalid_playlist_payload'` etc.
        // The original code did this for 'invalid_playlist_payload'.
        // It also did it for the spotify errors above.
        // For others, it threw `message` or `API Error: ...`.

        // Let's throw the errorCode if it exists, otherwise the message.
        // But wait, the original code only did this for specific codes.
        // For `createPlaylist`, it checked `invalid_playlist_payload`.
        // For `getReleases`, it checked `missing_user_access_token`.

        // To be safe and generic, let's attach the errorCode to the Error object
        // so callers can check it.
        const error = new Error(message ?? errorCode ?? `API Error: ${response.statusText}`);
        (error as any).code = errorCode;
        throw error;
      }

      throw new Error(message ?? `API Error: ${response.statusText}`);
    }

    return data as T;
  }

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${ApiRoutes.BASE}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    return this.handleResponse<T>(response);
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export const httpClient = new HttpClient();
