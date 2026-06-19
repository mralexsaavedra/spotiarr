/**
 * T-5.12 — useChatController.handleSubmit runs detectListeningIntent and forwards scope
 * to useGenerateAiPlaylistMutation via the { prompt, intent } shape.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockMutateAsync = vi.fn();

vi.mock("../../mutations/useGenerateAiPlaylistMutation", () => ({
  useGenerateAiPlaylistMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/lib/aiProgressBus", () => ({
  aiProgressBus: {
    on: vi.fn(),
    off: vi.fn(),
  },
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

vi.mock("../../queries/useChatMessagesQuery", () => ({
  useChatMessagesQuery: () => ({
    data: [],
    dataUpdatedAt: 1,
    isLoading: false,
    isSuccess: true,
  }),
}));

vi.mock("../../mutations/useClearChatMessagesMutation", () => ({
  useClearChatMessagesMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

const { useChatController } = await import("../useChatController");

afterEach(() => {
  vi.clearAllMocks();
});

describe("useChatController — intent detection and forwarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes detected scope 'tracks' to mutation when prompt mentions listening to songs", async () => {
    mockMutateAsync.mockResolvedValueOnce({ jobId: "j-tracks" });

    const { result } = renderHook(() => useChatController());

    act(() => {
      result.current.setPrompt("make me a playlist with my top songs");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockMutateAsync).toHaveBeenCalledOnce();
    const call = mockMutateAsync.mock.calls[0][0] as { prompt: string; intent?: string };
    expect(call.prompt).toBe("make me a playlist with my top songs");
    expect(call.intent).toBe("tracks");
  });

  it("passes detected scope 'artists' when prompt mentions top artists", async () => {
    mockMutateAsync.mockResolvedValueOnce({ jobId: "j-artists" });

    const { result } = renderHook(() => useChatController());

    act(() => {
      result.current.setPrompt("playlist based on my most listened artists");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    const call = mockMutateAsync.mock.calls[0][0] as { prompt: string; intent?: string };
    expect(call.intent).toBe("artists");
  });

  it("passes undefined intent when prompt has no listening context signal", async () => {
    mockMutateAsync.mockResolvedValueOnce({ jobId: "j-generic" });

    const { result } = renderHook(() => useChatController());

    act(() => {
      result.current.setPrompt("some chill jazz for studying");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    const call = mockMutateAsync.mock.calls[0][0] as { prompt: string; intent?: string };
    // Generic prompt → no intent detected → intent must be undefined (null scope → omitted)
    expect(call.intent).toBeUndefined();
  });

  it("mutation is still called with correct prompt shape even without intent", async () => {
    mockMutateAsync.mockResolvedValueOnce({ jobId: "j-plain" });

    const { result } = renderHook(() => useChatController());

    act(() => {
      result.current.setPrompt("epic classical music");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    const call = mockMutateAsync.mock.calls[0][0] as { prompt: string; intent?: string };
    expect(call.prompt).toBe("epic classical music");
  });
});
