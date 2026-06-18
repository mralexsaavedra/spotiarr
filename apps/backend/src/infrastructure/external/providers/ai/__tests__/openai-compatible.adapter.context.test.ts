/**
 * T-5.3 — listeningContext appended to prompt; SYSTEM_PROMPT unchanged.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { OpenAiCompatibleAdapter, type GenerateObjectFn } from "../openai-compatible.adapter";

const SYSTEM_PROMPT_FRAGMENT = "You are a music curator";

const makeAdapter = (overrides: Partial<{ generateFn: GenerateObjectFn }> = {}) => {
  const generateFn = overrides.generateFn ?? vi.fn();
  return {
    adapter: new OpenAiCompatibleAdapter({
      baseURL: "http://localhost:11434/v1",
      apiKey: "test-key",
      model: "llama3",
      generateFn: generateFn as GenerateObjectFn,
    }),
    generateFn: generateFn as ReturnType<typeof vi.fn>,
  };
};

describe("OpenAiCompatibleAdapter — listeningContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("appends listeningContext as suffix to the prompt when provided", async () => {
    const { adapter, generateFn } = makeAdapter();
    generateFn.mockResolvedValueOnce({ object: { tracks: [] } });

    await adapter.generateTracks("chill jazz", "Top tracks: Coltrane - A Love Supreme");

    const callArg = generateFn.mock.calls[0][0];
    expect(callArg.prompt).toContain("chill jazz");
    expect(callArg.prompt).toContain("Coltrane - A Love Supreme");
  });

  it("keeps SYSTEM_PROMPT unchanged when listeningContext is provided", async () => {
    const { adapter, generateFn } = makeAdapter();
    generateFn.mockResolvedValueOnce({ object: { tracks: [] } });

    await adapter.generateTracks("metal anthems", "Top artists: Metallica");

    const callArg = generateFn.mock.calls[0][0];
    expect(callArg.system).toContain(SYSTEM_PROMPT_FRAGMENT);
    // system must NOT contain the context content
    expect(callArg.system).not.toContain("Metallica");
  });

  it("does NOT append anything to prompt when listeningContext is absent", async () => {
    const { adapter, generateFn } = makeAdapter();
    generateFn.mockResolvedValueOnce({ object: { tracks: [] } });

    await adapter.generateTracks("epic rock");

    const callArg = generateFn.mock.calls[0][0];
    expect(callArg.prompt).toBe("epic rock");
  });

  it("does NOT append anything when listeningContext is an empty string", async () => {
    const { adapter, generateFn } = makeAdapter();
    generateFn.mockResolvedValueOnce({ object: { tracks: [] } });

    await adapter.generateTracks("ambient music", "");

    const callArg = generateFn.mock.calls[0][0];
    expect(callArg.prompt).toBe("ambient music");
  });

  it("SYSTEM_PROMPT is identical with and without listeningContext", async () => {
    const { adapter, generateFn } = makeAdapter();
    generateFn.mockResolvedValue({ object: { tracks: [] } });

    await adapter.generateTracks("prompt A");
    const systemWithout = generateFn.mock.calls[0][0].system;

    generateFn.mockClear();
    generateFn.mockResolvedValue({ object: { tracks: [] } });

    await adapter.generateTracks("prompt A", "Some context");
    const systemWith = generateFn.mock.calls[0][0].system;

    expect(systemWith).toBe(systemWithout);
  });
});
