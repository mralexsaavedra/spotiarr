import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useGlobalPlayerShortcuts } from "./useGlobalPlayerShortcuts";

const makeItem = () => ({
  id: "t1",
  name: "Track",
  artist: "Artist",
  audioUrl: "/audio/t1.mp3",
});

function dispatch(key: string, init: KeyboardEventInit = {}) {
  document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
}

beforeEach(() => {
  usePlayerStore.setState({
    queue: [makeItem()],
    currentIndex: 0,
    isPlaying: false,
    currentTime: 20,
    duration: 60,
    volume: 0.5,
    isMuted: false,
    error: null,
  });
});

afterEach(() => {
  usePlayerStore.getState().clear();
});

describe("useGlobalPlayerShortcuts", () => {
  it("Space toggles play when a track is active", () => {
    renderHook(() => useGlobalPlayerShortcuts());
    act(() => dispatch(" "));
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it("ArrowLeft seeks by -5 from currentTime", () => {
    renderHook(() => useGlobalPlayerShortcuts());
    act(() => dispatch("ArrowLeft"));
    expect(usePlayerStore.getState().currentTime).toBe(15);
  });

  it("ArrowRight seeks by +5 from currentTime", () => {
    renderHook(() => useGlobalPlayerShortcuts());
    act(() => dispatch("ArrowRight"));
    expect(usePlayerStore.getState().currentTime).toBe(25);
  });

  it("ArrowUp increases volume by 0.05", () => {
    renderHook(() => useGlobalPlayerShortcuts());
    act(() => dispatch("ArrowUp"));
    expect(usePlayerStore.getState().volume).toBeCloseTo(0.55);
  });

  it("ArrowDown decreases volume by 0.05", () => {
    renderHook(() => useGlobalPlayerShortcuts());
    act(() => dispatch("ArrowDown"));
    expect(usePlayerStore.getState().volume).toBeCloseTo(0.45);
  });

  it("m toggles mute", () => {
    renderHook(() => useGlobalPlayerShortcuts());
    act(() => dispatch("m"));
    expect(usePlayerStore.getState().isMuted).toBe(true);
  });

  it("no-op when currentIndex is null", () => {
    usePlayerStore.getState().clear();
    renderHook(() => useGlobalPlayerShortcuts());
    act(() => dispatch(" "));
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it("no-op when modifier key held (metaKey + Space)", () => {
    renderHook(() => useGlobalPlayerShortcuts());
    act(() => dispatch(" ", { metaKey: true }));
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it("no-op when event target is an INPUT element", () => {
    renderHook(() => useGlobalPlayerShortcuts());
    const input = document.createElement("input");
    document.body.appendChild(input);
    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    });
    document.body.removeChild(input);
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });
});
