import { beforeEach, describe, expect, it, vi } from "vitest";

// Zustand stores with `persist` are module-level singletons. We use
// vi.resetModules() + dynamic import in beforeEach so every test starts from a
// clean slate — same pattern as usePlayerStore.test.ts.

let usePreferencesStore: typeof import("./usePreferencesStore").usePreferencesStore;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import("./usePreferencesStore");
  usePreferencesStore = mod.usePreferencesStore;
  // Reset to initial state defined in the store factory
  usePreferencesStore.setState({ isSidebarCollapsed: false });
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe("initial state", () => {
  it("isSidebarCollapsed is false by default", () => {
    expect(usePreferencesStore.getState().isSidebarCollapsed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// toggleSidebar
// ---------------------------------------------------------------------------

describe("toggleSidebar", () => {
  it("flips isSidebarCollapsed from false to true", () => {
    usePreferencesStore.getState().toggleSidebar();
    expect(usePreferencesStore.getState().isSidebarCollapsed).toBe(true);
  });

  it("flips isSidebarCollapsed from true to false", () => {
    usePreferencesStore.setState({ isSidebarCollapsed: true });
    usePreferencesStore.getState().toggleSidebar();
    expect(usePreferencesStore.getState().isSidebarCollapsed).toBe(false);
  });

  it("toggles twice — returns to original value", () => {
    usePreferencesStore.getState().toggleSidebar();
    usePreferencesStore.getState().toggleSidebar();
    expect(usePreferencesStore.getState().isSidebarCollapsed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setSidebarCollapsed
// ---------------------------------------------------------------------------

describe("setSidebarCollapsed", () => {
  it("sets isSidebarCollapsed to true when called with true", () => {
    usePreferencesStore.getState().setSidebarCollapsed(true);
    expect(usePreferencesStore.getState().isSidebarCollapsed).toBe(true);
  });

  it("sets isSidebarCollapsed to false when called with false", () => {
    usePreferencesStore.setState({ isSidebarCollapsed: true });
    usePreferencesStore.getState().setSidebarCollapsed(false);
    expect(usePreferencesStore.getState().isSidebarCollapsed).toBe(false);
  });

  it("is idempotent — calling true twice remains true", () => {
    usePreferencesStore.getState().setSidebarCollapsed(true);
    usePreferencesStore.getState().setSidebarCollapsed(true);
    expect(usePreferencesStore.getState().isSidebarCollapsed).toBe(true);
  });

  it("is idempotent — calling false twice remains false", () => {
    usePreferencesStore.getState().setSidebarCollapsed(false);
    usePreferencesStore.getState().setSidebarCollapsed(false);
    expect(usePreferencesStore.getState().isSidebarCollapsed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// persist middleware: state changes survive setState round-trip
// ---------------------------------------------------------------------------

describe("persist — state updates are reflected after setState", () => {
  it("setSidebarCollapsed change is visible via getState()", () => {
    usePreferencesStore.getState().setSidebarCollapsed(true);
    // Verify the store reports the updated value (no async flush needed for
    // in-memory access; localStorage side-effects are not asserted here)
    expect(usePreferencesStore.getState().isSidebarCollapsed).toBe(true);
  });

  it("persist storage key is spotiarr-preferences", async () => {
    // Access the Zustand persist API to confirm the storage key is stable
    const persistApi = usePreferencesStore.persist;
    expect(persistApi.getOptions().name).toBe("spotiarr-preferences");
  });
});

describe("audioPrefetchCount", () => {
  it("defaults to 3", () => {
    expect(usePreferencesStore.getState().audioPrefetchCount).toBe(3);
  });

  it("setAudioPrefetchCount updates the value", () => {
    usePreferencesStore.getState().setAudioPrefetchCount(1);
    expect(usePreferencesStore.getState().audioPrefetchCount).toBe(1);
  });

  it("setAudioPrefetchCount(-1) clamps to 0", () => {
    usePreferencesStore.getState().setAudioPrefetchCount(-1);
    expect(usePreferencesStore.getState().audioPrefetchCount).toBe(0);
  });

  it("setAudioPrefetchCount(11) clamps to 10", () => {
    usePreferencesStore.getState().setAudioPrefetchCount(11);
    expect(usePreferencesStore.getState().audioPrefetchCount).toBe(10);
  });

  it("setAudioPrefetchCount(0) sets to 0 (lower bound inclusive)", () => {
    usePreferencesStore.getState().setAudioPrefetchCount(0);
    expect(usePreferencesStore.getState().audioPrefetchCount).toBe(0);
  });

  it("setAudioPrefetchCount(10) sets to 10 (upper bound inclusive)", () => {
    usePreferencesStore.getState().setAudioPrefetchCount(10);
    expect(usePreferencesStore.getState().audioPrefetchCount).toBe(10);
  });

  it("value is persisted under spotiarr-preferences key", () => {
    usePreferencesStore.getState().setAudioPrefetchCount(5);
    expect(usePreferencesStore.getState().audioPrefetchCount).toBe(5);
    expect(usePreferencesStore.persist.getOptions().name).toBe("spotiarr-preferences");
  });
});
