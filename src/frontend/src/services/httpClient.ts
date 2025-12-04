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

      if (errorCode === "missing_user_access_token") {
        throw new Error("missing_user_access_token");
      }

      if (errorCode === "spotify_rate_limited") {
        throw new Error("spotify_rate_limited");
      }

      if (errorCode) {
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
