import { type AiChatMessageDto, type AiPlaylistProgressEvent } from "@spotiarr/shared";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks for generate mutation ---
const mockMutateAsync = vi.fn();

vi.mock("../mutations/useGenerateAiPlaylistMutation", () => ({
  useGenerateAiPlaylistMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

// --- Mocks for aiProgressBus ---
let busListeners: Array<(e: AiPlaylistProgressEvent) => void> = [];

vi.mock("@/lib/aiProgressBus", () => ({
  aiProgressBus: {
    on: (fn: (e: AiPlaylistProgressEvent) => void) => busListeners.push(fn),
    off: (fn: (e: AiPlaylistProgressEvent) => void) => {
      busListeners = busListeners.filter((l) => l !== fn);
    },
  },
}));

// --- Mocks for query client ---
const mockInvalidateQueries = vi.fn();

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  };
});

// --- Mocks for chat messages query ---
let mockServerMessages: AiChatMessageDto[] = [];

vi.mock("../queries/useChatMessagesQuery", () => ({
  useChatMessagesQuery: () => ({
    data: mockServerMessages,
    isLoading: false,
    isSuccess: true,
  }),
}));

// --- Mock for clear mutation ---
const mockClearMutate = vi.fn();
let mockIsClearPending = false;

vi.mock("../mutations/useClearChatMessagesMutation", () => ({
  useClearChatMessagesMutation: () => ({
    mutate: mockClearMutate,
    isPending: mockIsClearPending,
  }),
}));

const emitProgress = (event: AiPlaylistProgressEvent) => {
  busListeners.forEach((fn) => fn(event));
};

const { useChatController } = await import("./useChatController");

afterEach(() => {
  vi.clearAllMocks();
  busListeners = [];
  mockServerMessages = [];
  mockIsClearPending = false;
});

describe("useChatController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    busListeners = [];
    mockServerMessages = [];
    mockIsClearPending = false;
  });

  it("initial state has empty prompt and idle stage", () => {
    const { result } = renderHook(() => useChatController());

    expect(result.current.prompt).toBe("");
    expect(result.current.stage).toBeNull();
    expect(result.current.isGenerating).toBe(false);
  });

  it("setPrompt updates the prompt value", () => {
    const { result } = renderHook(() => useChatController());

    act(() => {
      result.current.setPrompt("jazz for a rainy day");
    });

    expect(result.current.prompt).toBe("jazz for a rainy day");
  });

  // S-F-01: initial displayMessages is server data
  it("initial displayMessages is server data", () => {
    const serverMsg: AiChatMessageDto = {
      id: "m1",
      role: "user",
      content: { key: "aiChat.userPrompt", params: { prompt: "jazz" } },
      playlistId: null,
      errorCode: null,
      createdAt: 1000,
    };
    mockServerMessages = [serverMsg];

    const { result } = renderHook(() => useChatController());

    expect(result.current.displayMessages).toEqual([serverMsg]);
  });

  // S-F-02: handleSubmit adds optimistic user entry
  it("handleSubmit adds optimistic user entry", async () => {
    mockMutateAsync.mockResolvedValueOnce({ jobId: "j1" });
    mockServerMessages = [];

    const { result } = renderHook(() => useChatController());

    act(() => {
      result.current.setPrompt("jazz");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.displayMessages).toHaveLength(1);
    expect(result.current.displayMessages[0].role).toBe("user");
    expect(result.current.displayMessages[0].content.params?.prompt).toBe("jazz");
    // id must not be the old hardcoded "optimistic" — it is now a UUID
    expect(result.current.displayMessages[0].id).not.toBe("optimistic");
  });

  it("submit calls mutation with the current prompt and sets jobId", async () => {
    mockMutateAsync.mockResolvedValueOnce({ jobId: "job-abc" });

    const { result } = renderHook(() => useChatController());

    act(() => {
      result.current.setPrompt("latin jazz");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockMutateAsync).toHaveBeenCalledWith("latin jazz");
    expect(result.current.isGenerating).toBe(true);
  });

  it("clears the prompt after submitting", async () => {
    mockMutateAsync.mockResolvedValueOnce({ jobId: "job-clear" });

    const { result } = renderHook(() => useChatController());

    act(() => {
      result.current.setPrompt("ambient focus");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.prompt).toBe("");
  });

  it("does not call mutation when prompt is empty", async () => {
    const { result } = renderHook(() => useChatController());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("does not call mutation when prompt is whitespace only", async () => {
    const { result } = renderHook(() => useChatController());

    act(() => {
      result.current.setPrompt("   ");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("progress events update stage", async () => {
    mockMutateAsync.mockResolvedValueOnce({ jobId: "job-1" });

    const { result } = renderHook(() => useChatController());

    act(() => {
      result.current.setPrompt("chill beats");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    act(() => {
      emitProgress({ jobId: "job-1", stage: "llm", progress: 0.2 });
    });

    expect(result.current.stage).toBe("llm");

    act(() => {
      emitProgress({ jobId: "job-1", stage: "validating", progress: 0.5 });
    });

    expect(result.current.stage).toBe("validating");

    act(() => {
      emitProgress({ jobId: "job-1", stage: "saving", progress: 0.8 });
    });

    expect(result.current.stage).toBe("saving");
  });

  it("done stage updates resolvedCount, droppedTitles, and ends generation", async () => {
    mockMutateAsync.mockResolvedValueOnce({ jobId: "job-2" });

    const { result } = renderHook(() => useChatController());

    act(() => {
      result.current.setPrompt("hip hop classics");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    await act(async () => {
      emitProgress({
        jobId: "job-2",
        stage: "done",
        progress: 1,
        resolvedCount: 8,
        droppedTitles: ["Ghost Song"],
        playlistId: "playlist-2",
        playlistName: "AI: hip hop classics",
      });
    });

    await waitFor(() => {
      expect(result.current.stage).toBe("done");
      expect(result.current.resolvedCount).toBe(8);
      expect(result.current.droppedTitles).toEqual(["Ghost Song"]);
      expect(result.current.playlistId).toBe("playlist-2");
      expect(result.current.playlistName).toBe("AI: hip hop classics");
      expect(result.current.isGenerating).toBe(false);
    });
  });

  // S-F-03: done event invalidates chat messages query
  it("done stage invalidates aiChatMessages query", async () => {
    mockMutateAsync.mockResolvedValueOnce({ jobId: "job-3" });

    const { result } = renderHook(() => useChatController());

    act(() => {
      result.current.setPrompt("r&b");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    act(() => {
      emitProgress({ jobId: "job-3", stage: "done", progress: 1, resolvedCount: 3 });
    });

    await waitFor(() => {
      const calls = mockInvalidateQueries.mock.calls;
      const hasChatInvalidation = calls.some(
        (call) => JSON.stringify(call[0]?.queryKey) === JSON.stringify(["ai", "chat", "messages"]),
      );
      expect(hasChatInvalidation).toBe(true);
    });
  });

  // S-F-04: error event invalidates chat messages query
  it("error stage invalidates aiChatMessages query", async () => {
    mockMutateAsync.mockResolvedValueOnce({ jobId: "job-4" });

    const { result } = renderHook(() => useChatController());

    act(() => {
      result.current.setPrompt("metal");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    await act(async () => {
      emitProgress({
        jobId: "job-4",
        stage: "error",
        progress: 0,
        error: { code: "provider-misconfig", message: "Missing API key" },
      });
    });

    await waitFor(() => {
      expect(result.current.stage).toBe("error");
      expect(result.current.error?.code).toBe("provider-misconfig");
      expect(result.current.isGenerating).toBe(false);
    });

    const calls = mockInvalidateQueries.mock.calls;
    const hasChatInvalidation = calls.some(
      (call) => JSON.stringify(call[0]?.queryKey) === JSON.stringify(["ai", "chat", "messages"]),
    );
    expect(hasChatInvalidation).toBe(true);
  });

  // S-F-05: optimistic entry removed after server reconciliation (same hook, updated server data)
  it("optimistic entry suppressed when server already has matching user message", async () => {
    mockMutateAsync.mockResolvedValueOnce({ jobId: "j5" });

    const { result, rerender } = renderHook(() => useChatController());

    act(() => {
      result.current.setPrompt("jazz");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    // Optimistic entry is visible before server catches up (id is a UUID, not "optimistic")
    expect(result.current.displayMessages).toHaveLength(1);
    expect(result.current.displayMessages[0].id).not.toBe("optimistic");

    // Server now returns the persisted user message
    mockServerMessages = [
      {
        id: "server-m1",
        role: "user",
        content: { key: "aiChat.userPrompt", params: { prompt: "jazz" } },
        playlistId: null,
        errorCode: null,
        createdAt: Date.now(),
      },
    ];

    // Re-render the SAME hook instance to pick up new server data
    rerender();

    await waitFor(() => {
      // Optimistic entry must be suppressed — only the server message remains
      expect(result.current.displayMessages).toHaveLength(1);
      expect(result.current.displayMessages[0].id).toBe("server-m1");
    });
  });

  // S-F-02b: each optimistic entry gets a unique id (not hardcoded "optimistic")
  it("optimistic entry has a unique non-static id (UUID)", async () => {
    mockMutateAsync.mockResolvedValueOnce({ jobId: "j-uuid-1" });
    mockServerMessages = [];

    const { result } = renderHook(() => useChatController());

    act(() => {
      result.current.setPrompt("jazz");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    const optimisticId = result.current.displayMessages[0]?.id;
    expect(optimisticId).toBeDefined();
    expect(optimisticId).not.toBe("optimistic");
    // UUID format: 8-4-4-4-12 hex chars
    expect(optimisticId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  // S-F-10a: submitting a prompt identical to an existing server message STILL shows new optimistic bubble
  it("new optimistic bubble is visible even when an identical prompt is already in serverMessages", async () => {
    // Pre-existing server message with the same prompt (an old submission)
    const oldServerMessage: AiChatMessageDto = {
      id: "server-old",
      role: "user",
      content: { key: "aiChat.userPrompt", params: { prompt: "jazz" } },
      playlistId: null,
      errorCode: null,
      createdAt: 500, // old timestamp
    };
    mockServerMessages = [oldServerMessage];
    mockMutateAsync.mockResolvedValueOnce({ jobId: "j-same-prompt" });

    const { result } = renderHook(() => useChatController());

    act(() => {
      result.current.setPrompt("jazz");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    // Both the old server message AND the new optimistic bubble must be visible
    expect(result.current.displayMessages).toHaveLength(2);
    const ids = result.current.displayMessages.map((m) => m.id);
    expect(ids).toContain("server-old");
    // The new optimistic entry must be present (not suppressed by content-match)
    const hasOptimistic = ids.some((id) => id !== "server-old");
    expect(hasOptimistic).toBe(true);
  });

  // S-F-10b: after refetch brings the persisted message, optimistic is cleared (no permanent duplicate)
  it("optimistic entry is cleared when server refetch returns the persisted message, leaving no duplicate", async () => {
    mockMutateAsync.mockResolvedValueOnce({ jobId: "j-reconcile" });
    mockServerMessages = [];

    const { result, rerender } = renderHook(() => useChatController());

    act(() => {
      result.current.setPrompt("ambient");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    // Optimistic is visible before server catches up
    expect(result.current.displayMessages).toHaveLength(1);
    const optimisticCreatedAt = result.current.displayMessages[0].createdAt;

    // Server now returns the persisted user message (createdAt >= optimistic's createdAt)
    mockServerMessages = [
      {
        id: "server-persisted",
        role: "user",
        content: { key: "aiChat.userPrompt", params: { prompt: "ambient" } },
        playlistId: null,
        errorCode: null,
        createdAt: optimisticCreatedAt, // same or later than optimistic
      },
    ];

    // Re-render same hook instance to pick up new server data
    rerender();

    await waitFor(() => {
      // Only the persisted server message remains — no duplicate
      expect(result.current.displayMessages).toHaveLength(1);
      expect(result.current.displayMessages[0].id).toBe("server-persisted");
    });
  });

  // S-F-07: exposes clearMessages and isClearPending
  it("exposes clearMessages and isClearPending", () => {
    const { result } = renderHook(() => useChatController());

    expect(typeof result.current.clearMessages).toBe("function");
    expect(typeof result.current.isClearPending).toBe("boolean");
  });

  // S-F-08: clearMessages calls mutation
  it("clearMessages calls clear mutation", () => {
    const { result } = renderHook(() => useChatController());

    act(() => {
      result.current.clearMessages();
    });

    expect(mockClearMutate).toHaveBeenCalledTimes(1);
  });

  // S-F-09: optimistic entry is cleared when mutateAsync rejects; stage becomes "error"
  it("clears optimistic entry, sets stage to error, and surfaces error when mutateAsync rejects", async () => {
    const rejectionError = new Error("Network failure");
    mockMutateAsync.mockRejectedValueOnce(rejectionError);

    const { result } = renderHook(() => useChatController());

    act(() => {
      result.current.setPrompt("reggae");
    });

    await act(async () => {
      // handleSubmit should not throw to the caller
      await result.current.handleSubmit();
    });

    // Optimistic bubble must be gone
    await waitFor(() => {
      expect(result.current.displayMessages).toHaveLength(0);
    });

    // Error must be surfaced AND stage must be "error" so Chat.tsx renders the error block
    expect(result.current.error).not.toBeNull();
    expect(result.current.stage).toBe("error");
    expect(result.current.isGenerating).toBe(false);
  });

  it("ignores progress events from a different jobId", async () => {
    mockMutateAsync.mockResolvedValueOnce({ jobId: "job-5" });

    const { result } = renderHook(() => useChatController());

    act(() => {
      result.current.setPrompt("bossa nova");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    act(() => {
      emitProgress({ jobId: "other-job", stage: "done", progress: 1, resolvedCount: 5 });
    });

    expect(result.current.stage).not.toBe("done");
  });
});
