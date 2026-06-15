import { ApiRoutes } from "@spotiarr/shared";
import { describe, expect, it, vi } from "vitest";
import { httpClient } from "@/services/httpClient";
import { aiChatService } from "./aiChat.service";

vi.mock("@/services/httpClient", () => ({
  httpClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe("aiChatService", () => {
  it("generate posts to AI chat/generate endpoint and returns jobId", async () => {
    vi.mocked(httpClient.post).mockResolvedValueOnce({ data: { jobId: "job-123" } });

    const result = await aiChatService.generate("jazz for a rainy afternoon");

    expect(httpClient.post).toHaveBeenCalledWith(`${ApiRoutes.AI}/chat/generate`, {
      prompt: "jazz for a rainy afternoon",
    });
    expect(result).toEqual({ jobId: "job-123" });
  });

  it("unwraps data envelope and returns jobId only", async () => {
    vi.mocked(httpClient.post).mockResolvedValueOnce({ data: { jobId: "abc-456" } });

    const result = await aiChatService.generate("chill beats");

    expect(result.jobId).toBe("abc-456");
  });

  it("propagates errors thrown by httpClient", async () => {
    vi.mocked(httpClient.post).mockRejectedValueOnce(new Error("Network error"));

    await expect(aiChatService.generate("test")).rejects.toThrow("Network error");
  });
});

describe("aiChatService.getModels", () => {
  it("calls POST /ai/models with overrides and returns the models array", async () => {
    vi.mocked(httpClient.post).mockResolvedValueOnce({
      data: { models: ["gpt-4o", "gpt-3.5-turbo"] },
    });

    const overrides = { provider: "openai", baseURL: "https://api.openai.com/v1", apiKey: "sk-x" };
    const result = await aiChatService.getModels(overrides);

    expect(httpClient.post).toHaveBeenCalledWith(`${ApiRoutes.AI}/models`, overrides);
    expect(result).toEqual(["gpt-4o", "gpt-3.5-turbo"]);
  });

  it("calls POST /ai/models with empty overrides when none provided", async () => {
    vi.mocked(httpClient.post).mockResolvedValueOnce({
      data: { models: [] },
    });

    const result = await aiChatService.getModels();

    expect(httpClient.post).toHaveBeenCalledWith(`${ApiRoutes.AI}/models`, {});
    expect(result).toEqual([]);
  });

  it("returns empty array when models is empty", async () => {
    vi.mocked(httpClient.post).mockResolvedValueOnce({ data: { models: [] } });

    const result = await aiChatService.getModels();

    expect(result).toEqual([]);
  });

  it("propagates errors thrown by httpClient", async () => {
    vi.mocked(httpClient.post).mockRejectedValueOnce(new Error("Provider unreachable"));

    await expect(aiChatService.getModels()).rejects.toThrow("Provider unreachable");
  });
});
