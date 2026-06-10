import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AiTrackSuggestion } from "@/application/ports/ai-chat.port";
import { AiChatError } from "@/domain/errors/ai-chat.error";
import { OpenAiCompatibleAdapter, type GenerateObjectFn } from "./openai-compatible.adapter";

const makeAdapter = (
  overrides: Partial<{
    baseURL: string;
    apiKey: string;
    model: string;
    generateFn: GenerateObjectFn;
  }> = {},
) => {
  const generateFn = overrides.generateFn ?? vi.fn();
  return {
    adapter: new OpenAiCompatibleAdapter({
      baseURL: overrides.baseURL ?? "http://localhost:11434/v1",
      apiKey: overrides.apiKey ?? "test-key",
      model: overrides.model ?? "llama3",
      generateFn,
    }),
    generateFn: generateFn as ReturnType<typeof vi.fn>,
  };
};

describe("OpenAiCompatibleAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateTracks — success", () => {
    it("returns tracks from the LLM response", async () => {
      const tracks: AiTrackSuggestion[] = [
        { title: "Bohemian Rhapsody", artist: "Queen" },
        { title: "Hotel California", artist: "Eagles" },
      ];
      const { adapter, generateFn } = makeAdapter();
      generateFn.mockResolvedValueOnce({ object: { tracks } });

      const result = await adapter.generateTracks("epic rock playlist");

      expect(result).toEqual(tracks);
      expect(generateFn).toHaveBeenCalledOnce();
    });

    it("passes the prompt to the generate function", async () => {
      const { adapter, generateFn } = makeAdapter();
      generateFn.mockResolvedValueOnce({ object: { tracks: [] } });

      await adapter.generateTracks("chill jazz for studying");

      const callArg = generateFn.mock.calls[0][0];
      expect(callArg.prompt).toBe("chill jazz for studying");
    });
  });

  describe("generateTracks — error mapping", () => {
    it("maps missing baseURL/apiKey to provider-misconfig", async () => {
      const { adapter, generateFn } = makeAdapter({ baseURL: "", apiKey: "" });
      generateFn.mockRejectedValueOnce(new Error("invalid url"));

      await expect(adapter.generateTracks("test")).rejects.toThrow(AiChatError);
      await expect(adapter.generateTracks("test")).rejects.toMatchObject({
        code: "provider-misconfig",
      });
    });

    it("maps network error to provider-unreachable", async () => {
      const { adapter, generateFn } = makeAdapter();
      const networkErr = new TypeError("fetch failed");
      generateFn.mockRejectedValue(networkErr);

      await expect(adapter.generateTracks("test")).rejects.toMatchObject({
        code: "provider-unreachable",
      });
    });

    it("maps NoObjectGeneratedError to llm-bad-output", async () => {
      const { adapter, generateFn } = makeAdapter();
      const noObjErr = Object.assign(new Error("no object generated"), {
        name: "AI_NoObjectGeneratedError",
      });
      generateFn.mockRejectedValue(noObjErr);

      await expect(adapter.generateTracks("test")).rejects.toMatchObject({
        code: "llm-bad-output",
      });
    });

    it("maps ZodError to llm-bad-output", async () => {
      const { adapter, generateFn } = makeAdapter();
      const zodErr = Object.assign(new Error("zod parse failed"), {
        name: "ZodError",
      });
      generateFn.mockRejectedValue(zodErr);

      await expect(adapter.generateTracks("test")).rejects.toMatchObject({
        code: "llm-bad-output",
      });
    });
  });
});
