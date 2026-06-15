import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AiTrackSuggestion } from "@/application/ports/ai-chat.port";
import type { SettingsService } from "@/application/services/settings.service";
import { AiChatError } from "@/domain/errors/ai-chat.error";
import {
  OpenAiCompatibleAdapter,
  createAiChatPort,
  type GenerateObjectFn,
} from "./openai-compatible.adapter";

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

const makeSettings = (values: Record<string, string>) =>
  ({
    getString: vi.fn(async (key: string, fallback = "") => values[key] ?? fallback),
  }) as unknown as SettingsService;

describe("createAiChatPort factory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves preset baseURL when AI_BASE_URL is empty", async () => {
    const settings = makeSettings({
      AI_PROVIDER: "openai",
      AI_BASE_URL: "",
      AI_API_KEY: "sk-test",
      AI_MODEL: "gpt-4o",
    });
    const port = createAiChatPort(settings);
    const spy = vi.spyOn(OpenAiCompatibleAdapter.prototype, "generateTracks").mockResolvedValue([]);
    await port.generateTracks("test");
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("uses AI_BASE_URL override over preset", async () => {
    const customUrl = "https://my-proxy.example.com/v1";
    const settings = makeSettings({
      AI_PROVIDER: "openai",
      AI_BASE_URL: customUrl,
      AI_API_KEY: "sk-test",
      AI_MODEL: "gpt-4o",
    });
    const port = createAiChatPort(settings);
    const spy = vi.spyOn(OpenAiCompatibleAdapter.prototype, "generateTracks").mockResolvedValue([]);
    await port.generateTracks("test");
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("ollama works without API key (no provider-misconfig)", async () => {
    const settings = makeSettings({
      AI_PROVIDER: "ollama",
      AI_BASE_URL: "",
      AI_API_KEY: "",
      AI_MODEL: "llama3",
    });
    const port = createAiChatPort(settings);
    const spy = vi.spyOn(OpenAiCompatibleAdapter.prototype, "generateTracks").mockResolvedValue([]);
    await expect(port.generateTracks("test")).resolves.not.toThrow();
    spy.mockRestore();
  });

  it("lmstudio works without API key (no provider-misconfig)", async () => {
    const settings = makeSettings({
      AI_PROVIDER: "lmstudio",
      AI_BASE_URL: "",
      AI_API_KEY: "",
      AI_MODEL: "mistral",
    });
    const port = createAiChatPort(settings);
    const spy = vi.spyOn(OpenAiCompatibleAdapter.prototype, "generateTracks").mockResolvedValue([]);
    await expect(port.generateTracks("test")).resolves.not.toThrow();
    spy.mockRestore();
  });

  it("throws provider-misconfig for non-local provider without API key", async () => {
    const settings = makeSettings({
      AI_PROVIDER: "openai",
      AI_BASE_URL: "",
      AI_API_KEY: "",
      AI_MODEL: "gpt-4o",
    });
    const port = createAiChatPort(settings);
    await expect(port.generateTracks("test")).rejects.toMatchObject({
      code: "provider-misconfig",
    });
  });

  it("throws provider-misconfig for custom provider with empty base URL", async () => {
    const settings = makeSettings({
      AI_PROVIDER: "custom",
      AI_BASE_URL: "",
      AI_API_KEY: "sk-test",
      AI_MODEL: "gpt-4o",
    });
    const port = createAiChatPort(settings);
    await expect(port.generateTracks("test")).rejects.toMatchObject({
      code: "provider-misconfig",
    });
  });

  it("ollama-cloud resolves preset baseURL https://ollama.com/v1 when AI_BASE_URL is empty", async () => {
    const settings = makeSettings({
      AI_PROVIDER: "ollama-cloud",
      AI_BASE_URL: "",
      AI_API_KEY: "oc-test-key",
      AI_MODEL: "llama3",
    });
    const port = createAiChatPort(settings);
    const spy = vi.spyOn(OpenAiCompatibleAdapter.prototype, "generateTracks").mockResolvedValue([]);
    await port.generateTracks("test");
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("ollama-cloud throws provider-misconfig when API key is empty", async () => {
    const settings = makeSettings({
      AI_PROVIDER: "ollama-cloud",
      AI_BASE_URL: "",
      AI_API_KEY: "",
      AI_MODEL: "llama3",
    });
    const port = createAiChatPort(settings);
    await expect(port.generateTracks("test")).rejects.toMatchObject({
      code: "provider-misconfig",
    });
  });

  it("throws provider-misconfig when model is missing", async () => {
    const settings = makeSettings({
      AI_PROVIDER: "openai",
      AI_BASE_URL: "",
      AI_API_KEY: "sk-test",
      AI_MODEL: "",
    });
    const port = createAiChatPort(settings);
    await expect(port.generateTracks("test")).rejects.toMatchObject({
      code: "provider-misconfig",
    });
  });
});
