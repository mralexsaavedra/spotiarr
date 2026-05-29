import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/hooks/queryKeys";
import { useServerEvents } from "@/hooks/useServerEvents";

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  readyState = 0;
  listeners = new Map<string, ((event: MessageEvent) => void)[]>();
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, cb: (event: MessageEvent) => void) {
    const list = this.listeners.get(type) ?? [];
    list.push(cb);
    this.listeners.set(type, list);
  }

  dispatch(type: string, data?: unknown) {
    const list = this.listeners.get(type) ?? [];
    for (const cb of list) {
      cb(new MessageEvent(type, { data: JSON.stringify(data ?? {}) }));
    }
  }

  close() {
    this.readyState = 2;
  }
}

describe("useServerEvents", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource);
  });

  it("invalidates releases and followed artists on catalog-updated", () => {
    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useServerEvents(), { wrapper });

    const source = MockEventSource.instances[0];
    source.dispatch("catalog-updated");

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.releases });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.followedArtists });
  });

  it("invalidates expected queries on feed-updated and library-updated", () => {
    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useServerEvents(), { wrapper });

    const source = MockEventSource.instances[0];
    source.dispatch("feed-updated");
    source.dispatch("library-updated");

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.releases });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.followedArtists });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.libraryStats });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.libraryArtists });
  });

  it("invalidates artwork backfill status on artwork-backfill-updated", () => {
    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useServerEvents(), { wrapper });

    const source = MockEventSource.instances[0];
    source.dispatch("artwork-backfill-updated");

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.artworkBackfillStatus,
    });
  });

  it("closes EventSource on unmount", () => {
    const queryClient = new QueryClient();

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { unmount } = renderHook(() => useServerEvents(), { wrapper });

    unmount();

    expect(MockEventSource.instances[0].readyState).toBe(2);
  });
});
