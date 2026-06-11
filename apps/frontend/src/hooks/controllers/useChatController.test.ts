import { type AiPlaylistProgressEvent } from "@spotiarr/shared";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockMutateAsync = vi.fn();

vi.mock("../mutations/useGenerateAiPlaylistMutation", () => ({
  useGenerateAiPlaylistMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

let busListeners: Array<(e: AiPlaylistProgressEvent) => void> = [];

vi.mock("@/lib/aiProgressBus", () => ({
  aiProgressBus: {
    on: (fn: (e: AiPlaylistProgressEvent) => void) => busListeners.push(fn),
    off: (fn: (e: AiPlaylistProgressEvent) => void) => {
      busListeners = busListeners.filter((l) => l !== fn);
    },
  },
}));

const mockInvalidateQueries = vi.fn();

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  };
});

const emitProgress = (event: AiPlaylistProgressEvent) => {
  busListeners.forEach((fn) => fn(event));
};

const { useChatController } = await import("./useChatController");

afterEach(() => {
  vi.clearAllMocks();
  busListeners = [];
});

describe("useChatController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    busListeners = [];
  });

  it("initial state has empty prompt and idle stage", () => {
    const { result } = renderHook(() => useChatController());

    expect(result.current.prompt).toBe("");
    expect(result.current.stage).toBeNull();
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.messages).toEqual([]);
  });

  it("setPrompt updates the prompt value", () => {
    const { result } = renderHook(() => useChatController());

    act(() => {
      result.current.setPrompt("jazz for a rainy day");
    });

    expect(result.current.prompt).toBe("jazz for a rainy day");
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
      });
    });

    await waitFor(() => {
      expect(result.current.stage).toBe("done");
      expect(result.current.resolvedCount).toBe(8);
      expect(result.current.droppedTitles).toEqual(["Ghost Song"]);
      expect(result.current.isGenerating).toBe(false);
    });
  });

  it("done stage invalidates playlist queries", async () => {
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
      expect(mockInvalidateQueries).toHaveBeenCalled();
    });
  });

  it("error stage sets error and ends generation", async () => {
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
