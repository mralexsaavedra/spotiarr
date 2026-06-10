import { ApiRoutes, type ApiErrorCode, type ApiErrorShape } from "@spotiarr/shared";

export class ApiError extends Error {
  constructor(
    public message: string,
    public code?: ApiErrorCode,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let _onUnauthorized: (() => void) | undefined;

export function setUnauthorizedHandler(fn: () => void): void {
  _onUnauthorized = fn;
}

export function clearUnauthorizedHandler(): void {
  _onUnauthorized = undefined;
}

const AUTH_ENDPOINTS = [ApiRoutes.AUTH_UNLOCK, ApiRoutes.AUTH_SESSION];

class HttpClient {
  private async handleResponse<T>(response: Response, endpoint: string): Promise<T> {
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const text = await response.text();
    const data = text ? (JSON.parse(text) as unknown) : undefined;

    let errorCode: ApiErrorCode | undefined;
    let message: string | undefined;

    if (typeof data === "object" && data !== null && "error" in data) {
      const shape = data as ApiErrorShape;
      errorCode = shape.error;
      message = shape.message;
    }

    // Only the instance-token 401 ("unauthorized") triggers the lock screen.
    // Other 401s (e.g. "missing_user_access_token" from Spotify) are unrelated
    // to instance auth and must not force the gate when no token is configured.
    if (
      response.status === 401 &&
      errorCode === "unauthorized" &&
      !AUTH_ENDPOINTS.some((e) => endpoint === e || endpoint.startsWith(e + "/"))
    ) {
      _onUnauthorized?.();
    }

    if (!response.ok) {
      throw new ApiError(
        message ?? errorCode ?? `API Error: ${response.statusText}`,
        errorCode,
        response.status,
      );
    }

    return data as T;
  }

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${ApiRoutes.BASE}${endpoint}`, {
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    return this.handleResponse<T>(response, endpoint);
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
