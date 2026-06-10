import { ApiRoutes } from "@spotiarr/shared";
import { describe, expect, it, vi } from "vitest";
import { httpClient } from "@/services/httpClient";
import { authService } from "./auth.service";

vi.mock("@/services/httpClient", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("authService", () => {
  it("getSession calls httpClient.get with AUTH_SESSION and returns the result", async () => {
    const payload = { authenticated: true };
    vi.mocked(httpClient.get).mockResolvedValueOnce(payload);

    const result = await authService.getSession();

    expect(httpClient.get).toHaveBeenCalledWith(ApiRoutes.AUTH_SESSION);
    expect(result).toBe(payload);
  });

  it("unlock calls httpClient.post with AUTH_UNLOCK and token, and returns the result", async () => {
    const payload = { ok: true };
    vi.mocked(httpClient.post).mockResolvedValueOnce(payload);

    const result = await authService.unlock("secret");

    expect(httpClient.post).toHaveBeenCalledWith(ApiRoutes.AUTH_UNLOCK, { token: "secret" });
    expect(result).toBe(payload);
  });
});
