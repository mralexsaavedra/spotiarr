/**
 * T-5.12 — useGenerateAiPlaylistMutation forwards { prompt, intent } to aiChatService.generate
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { aiChatService } from "@/services/aiChat.service";
import { useGenerateAiPlaylistMutation } from "../useGenerateAiPlaylistMutation";

vi.mock("@/services/aiChat.service", () => ({
  aiChatService: {
    generate: vi.fn(),
  },
}));

let queryClient: QueryClient;

const createWrapper = () => {
  queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("useGenerateAiPlaylistMutation — intent forwarding", () => {
  it("calls aiChatService.generate with prompt and intent when intent is provided", async () => {
    vi.mocked(aiChatService.generate).mockResolvedValueOnce({ jobId: "job-with-intent" });

    const { result } = renderHook(() => useGenerateAiPlaylistMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ prompt: "my top songs", intent: "tracks" });
    });

    expect(aiChatService.generate).toHaveBeenCalledWith("my top songs", "tracks");
  });

  it("calls aiChatService.generate with prompt and null/undefined when intent is not provided", async () => {
    vi.mocked(aiChatService.generate).mockResolvedValueOnce({ jobId: "job-no-intent" });

    const { result } = renderHook(() => useGenerateAiPlaylistMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ prompt: "chill vibes" });
    });

    // intent absent → service called with prompt only (or undefined intent)
    const call = vi.mocked(aiChatService.generate).mock.calls[0];
    expect(call[0]).toBe("chill vibes");
    // second arg must be undefined or not provided
    expect(call[1]).toBeUndefined();
  });

  it("returns jobId on success", async () => {
    vi.mocked(aiChatService.generate).mockResolvedValueOnce({ jobId: "job-xyz" });

    const { result } = renderHook(() => useGenerateAiPlaylistMutation(), {
      wrapper: createWrapper(),
    });

    let returnedData: { jobId: string } | undefined;
    await act(async () => {
      returnedData = await result.current.mutateAsync({ prompt: "jazz", intent: "artists" });
    });

    expect(returnedData?.jobId).toBe("job-xyz");
  });
});
