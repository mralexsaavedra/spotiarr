/**
 * T-5.12 — aiChat.service.generate forwards listeningIntent in POST body when provided
 */
import { ApiRoutes } from "@spotiarr/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { aiChatService } from "@/services/aiChat.service";
import { httpClient } from "@/services/httpClient";

vi.mock("@/services/httpClient", () => ({
  httpClient: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("aiChatService.generate — listeningIntent", () => {
  it("includes listeningIntent in POST body when intent is provided", async () => {
    vi.mocked(httpClient.post).mockResolvedValueOnce({ data: { jobId: "job-123" } });

    await aiChatService.generate("my most listened songs", "tracks");

    expect(httpClient.post).toHaveBeenCalledWith(`${ApiRoutes.AI}/chat/generate`, {
      prompt: "my most listened songs",
      listeningIntent: "tracks",
    });
  });

  it("does NOT include listeningIntent in POST body when intent is absent", async () => {
    vi.mocked(httpClient.post).mockResolvedValueOnce({ data: { jobId: "job-456" } });

    await aiChatService.generate("jazz for the evening");

    const callArg = vi.mocked(httpClient.post).mock.calls[0][1] as Record<string, unknown>;
    expect(callArg).not.toHaveProperty("listeningIntent");
  });

  it("does NOT include listeningIntent when intent is undefined", async () => {
    vi.mocked(httpClient.post).mockResolvedValueOnce({ data: { jobId: "job-789" } });

    await aiChatService.generate("chill beats", undefined);

    const callArg = vi.mocked(httpClient.post).mock.calls[0][1] as Record<string, unknown>;
    expect(callArg).not.toHaveProperty("listeningIntent");
  });
});
