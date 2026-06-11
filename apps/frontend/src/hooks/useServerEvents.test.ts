import { QueryClient } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aiProgressBus } from "@/lib/aiProgressBus";
import { queryKeys } from "./queryKeys";

const addEventListenerMock = vi.fn();
const closeMock = vi.fn();

vi.mock("@/lib/aiProgressBus", () => ({
  aiProgressBus: {
    emit: vi.fn(),
  },
}));

let mockQueryClient: QueryClient;
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => mockQueryClient,
  };
});

const eventHandlers: Record<string, (event: MessageEvent) => void> = {};

beforeEach(() => {
  mockQueryClient = new QueryClient();
  vi.spyOn(mockQueryClient, "invalidateQueries");

  vi.stubGlobal(
    "EventSource",
    vi.fn().mockImplementation(() => ({
      addEventListener: (name: string, handler: (event: MessageEvent) => void) => {
        eventHandlers[name] = handler;
        addEventListenerMock(name, handler);
      },
      onerror: null,
      close: closeMock,
    })),
  );
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  for (const key of Object.keys(eventHandlers)) {
    delete eventHandlers[key];
  }
});

const { useServerEvents } = await import("./useServerEvents");

describe("useServerEvents — ai-playlist-progress", () => {
  it("registers an ai-playlist-progress listener", () => {
    renderHook(() => useServerEvents());
    expect(addEventListenerMock).toHaveBeenCalledWith("ai-playlist-progress", expect.any(Function));
  });

  it("emits to aiProgressBus when ai-playlist-progress event fires", () => {
    renderHook(() => useServerEvents());

    const payload = { jobId: "j1", stage: "llm", progress: 0.3 };
    const event = { data: JSON.stringify(payload) } as MessageEvent;
    eventHandlers["ai-playlist-progress"]?.(event);

    expect(aiProgressBus.emit).toHaveBeenCalledWith(payload);
  });

  it("invalidates playlists query on done stage", () => {
    renderHook(() => useServerEvents());

    const payload = { jobId: "j1", stage: "done", progress: 1, resolvedCount: 3 };
    const event = { data: JSON.stringify(payload) } as MessageEvent;
    eventHandlers["ai-playlist-progress"]?.(event);

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.playlists,
    });
  });

  it("invalidates playlists query on error stage", () => {
    renderHook(() => useServerEvents());

    const payload = {
      jobId: "j1",
      stage: "error",
      progress: 0,
      error: { code: "provider-misconfig", message: "bad" },
    };
    const event = { data: JSON.stringify(payload) } as MessageEvent;
    eventHandlers["ai-playlist-progress"]?.(event);

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.playlists,
    });
  });

  it("does not invalidate playlists query for intermediate stages", () => {
    renderHook(() => useServerEvents());

    const payload = { jobId: "j1", stage: "validating", progress: 0.5 };
    const event = { data: JSON.stringify(payload) } as MessageEvent;
    eventHandlers["ai-playlist-progress"]?.(event);

    expect(aiProgressBus.emit).toHaveBeenCalledWith(payload);
    const invalidateCalls = vi.mocked(mockQueryClient.invalidateQueries).mock.calls;
    const playlistInvalidation = invalidateCalls.find(
      ([arg]) => JSON.stringify(arg) === JSON.stringify({ queryKey: queryKeys.playlists }),
    );
    expect(playlistInvalidation).toBeUndefined();
  });
});
