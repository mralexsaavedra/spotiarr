import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { aiChatService } from "@/services/aiChat.service";
import { useChatMessagesQuery } from "./useChatMessagesQuery";

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
    defaultOptions: {
      queries: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("useChatMessagesQuery", () => {
  it("calls getChatMessages on mount", async () => {
    vi.mocked(aiChatService.getChatMessages).mockResolvedValueOnce({
      messages: [
        {
          id: "m1",
          role: "user",
          content: { key: "aiChat.userPrompt", params: { prompt: "jazz" } },
          playlistId: null,
          errorCode: null,
          createdAt: 1000,
        },
      ],
    });

    const { result } = renderHook(() => useChatMessagesQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(aiChatService.getChatMessages).toHaveBeenCalledTimes(1);
  });

  it("returns messages from the service response", async () => {
    const mockMessages = [
      {
        id: "m1",
        role: "user" as const,
        content: { key: "aiChat.userPrompt", params: { prompt: "jazz" } },
        playlistId: null,
        errorCode: null,
        createdAt: 1000,
      },
    ];

    vi.mocked(aiChatService.getChatMessages).mockResolvedValueOnce({
      messages: mockMessages,
    });

    const { result } = renderHook(() => useChatMessagesQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockMessages);
  });

  it("returns empty array when server has no messages", async () => {
    vi.mocked(aiChatService.getChatMessages).mockResolvedValueOnce({ messages: [] });

    const { result } = renderHook(() => useChatMessagesQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });
});
