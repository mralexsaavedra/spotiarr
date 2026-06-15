import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { aiChatService } from "@/services/aiChat.service";
import { queryKeys } from "../queryKeys";
import { useClearChatMessagesMutation } from "./useClearChatMessagesMutation";

vi.mock("@/services/aiChat.service", () => ({
  aiChatService: {
    generate: vi.fn(),
    getModels: vi.fn(),
    getChatMessages: vi.fn(),
    clearChatMessages: vi.fn(),
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

describe("useClearChatMessagesMutation", () => {
  it("calls clearChatMessages when mutate is triggered", async () => {
    vi.mocked(aiChatService.clearChatMessages).mockResolvedValueOnce({ deleted: 2 });

    const { result } = renderHook(() => useClearChatMessagesMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(aiChatService.clearChatMessages).toHaveBeenCalledTimes(1);
  });

  it("invalidates aiChatMessages query on success", async () => {
    vi.mocked(aiChatService.clearChatMessages).mockResolvedValueOnce({ deleted: 2 });

    const { result } = renderHook(() => useClearChatMessagesMutation(), {
      wrapper: createWrapper(),
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync();
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.aiChatMessages,
      });
    });
  });

  it("returns deleted count on success", async () => {
    vi.mocked(aiChatService.clearChatMessages).mockResolvedValueOnce({ deleted: 5 });

    const { result } = renderHook(() => useClearChatMessagesMutation(), {
      wrapper: createWrapper(),
    });

    let data: { deleted: number } | undefined;
    await act(async () => {
      data = await result.current.mutateAsync();
    });

    expect(data?.deleted).toBe(5);
  });
});
