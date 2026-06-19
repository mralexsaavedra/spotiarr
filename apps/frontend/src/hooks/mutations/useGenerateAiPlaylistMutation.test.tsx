import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { aiChatService } from "@/services/aiChat.service";
import { useGenerateAiPlaylistMutation } from "./useGenerateAiPlaylistMutation";

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

describe("useGenerateAiPlaylistMutation", () => {
  it("calls aiChatService.generate with the prompt", async () => {
    vi.mocked(aiChatService.generate).mockResolvedValueOnce({ jobId: "job-xyz" });

    const { result } = renderHook(() => useGenerateAiPlaylistMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ prompt: "top jazz tracks" });
    });

    expect(aiChatService.generate).toHaveBeenCalledWith("top jazz tracks", undefined);
  });

  it("returns the jobId on success", async () => {
    vi.mocked(aiChatService.generate).mockResolvedValueOnce({ jobId: "job-xyz" });

    const { result } = renderHook(() => useGenerateAiPlaylistMutation(), {
      wrapper: createWrapper(),
    });

    let returnedData: { jobId: string } | undefined;
    await act(async () => {
      returnedData = await result.current.mutateAsync({ prompt: "chill vibes" });
    });

    expect(returnedData?.jobId).toBe("job-xyz");
  });

  it("is in error state when service throws", async () => {
    vi.mocked(aiChatService.generate).mockRejectedValueOnce(new Error("Service unavailable"));

    const { result } = renderHook(() => useGenerateAiPlaylistMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ prompt: "test prompt" }).catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
