import { ApiErrorCode, ApiErrorShape, ApiRoutes } from "@spotiarr/shared";

export class ApiError extends Error {
  constructor(
    public message: string,
    public code?: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

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
