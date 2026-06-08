import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPlayerUISlice, type PlayerUISlice } from "./playerUISlice";

describe("createPlayerUISlice", () => {
  let set: ReturnType<typeof vi.fn>;
  let slice: PlayerUISlice;

  beforeEach(() => {
    set = vi.fn();
    slice = createPlayerUISlice(set as never, () => slice as never, undefined as never);
  });

  it("initializes isQueuePanelOpen to false", () => {
    expect(slice.isQueuePanelOpen).toBe(false);
  });

  it("initializes isNowPlayingOpen to false", () => {
    expect(slice.isNowPlayingOpen).toBe(false);
  });

  it("setQueuePanelOpen calls set with { isQueuePanelOpen: true }", () => {
    slice.setQueuePanelOpen(true);
    expect(set).toHaveBeenCalledWith({ isQueuePanelOpen: true });
  });

  it("setQueuePanelOpen calls set with { isQueuePanelOpen: false }", () => {
    slice.setQueuePanelOpen(false);
    expect(set).toHaveBeenCalledWith({ isQueuePanelOpen: false });
  });

  it("setNowPlayingOpen calls set with { isNowPlayingOpen: true }", () => {
    slice.setNowPlayingOpen(true);
    expect(set).toHaveBeenCalledWith({ isNowPlayingOpen: true });
  });

  it("setNowPlayingOpen calls set with { isNowPlayingOpen: false }", () => {
    slice.setNowPlayingOpen(false);
    expect(set).toHaveBeenCalledWith({ isNowPlayingOpen: false });
  });
});
