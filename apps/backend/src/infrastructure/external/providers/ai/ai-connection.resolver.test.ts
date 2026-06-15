import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SettingsService } from "@/application/services/settings.service";
import { resolveAiConnection } from "./ai-connection.resolver";

const makeSettings = (values: Record<string, string>) =>
  ({
    getString: vi.fn(async (key: string, fallback = "") => values[key] ?? fallback),
  }) as unknown as SettingsService;

describe("resolveAiConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves preset baseURL for openai when AI_BASE_URL is empty", async () => {
    const settings = makeSettings({
      AI_PROVIDER: "openai",
      AI_BASE_URL: "",
      AI_API_KEY: "sk-test",
      AI_MODEL: "gpt-4o",
    });

    const result = await resolveAiConnection(settings);

    expect(result.baseURL).toBe("https://api.openai.com/v1");
    expect(result.apiKey).toBe("sk-test");
    expect(result.provider).toBe("openai");
  });

  it("uses AI_BASE_URL override over preset", async () => {
    const settings = makeSettings({
      AI_PROVIDER: "openai",
      AI_BASE_URL: "https://my-proxy.example.com/v1",
      AI_API_KEY: "sk-test",
      AI_MODEL: "gpt-4o",
    });

    const result = await resolveAiConnection(settings);

    expect(result.baseURL).toBe("https://my-proxy.example.com/v1");
  });

  it("injects placeholder key for ollama (local provider)", async () => {
    const settings = makeSettings({
      AI_PROVIDER: "ollama",
      AI_BASE_URL: "",
      AI_API_KEY: "",
      AI_MODEL: "llama3",
    });

    const result = await resolveAiConnection(settings);

    expect(result.apiKey).toBe("local");
    expect(result.baseURL).toBe("http://localhost:11434/v1");
  });

  it("injects placeholder key for lmstudio (local provider)", async () => {
    const settings = makeSettings({
      AI_PROVIDER: "lmstudio",
      AI_BASE_URL: "",
      AI_API_KEY: "",
      AI_MODEL: "mistral",
    });

    const result = await resolveAiConnection(settings);

    expect(result.apiKey).toBe("local");
  });

  it("throws provider-misconfig for non-local provider without API key", async () => {
    const settings = makeSettings({
      AI_PROVIDER: "openai",
      AI_BASE_URL: "",
      AI_API_KEY: "",
      AI_MODEL: "gpt-4o",
    });

    await expect(resolveAiConnection(settings)).rejects.toMatchObject({
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

    await expect(resolveAiConnection(settings)).rejects.toMatchObject({
      code: "provider-misconfig",
    });
  });

  it("normalizes an unknown provider to openai default", async () => {
    const settings = makeSettings({
      AI_PROVIDER: "openai-compatible",
      AI_BASE_URL: "",
      AI_API_KEY: "sk-test",
      AI_MODEL: "gpt-4o",
    });

    const result = await resolveAiConnection(settings);

    expect(result.provider).toBe("openai");
    expect(result.baseURL).toBe("https://api.openai.com/v1");
  });
});

describe("resolveAiConnection — overrides", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("override provider wins over stored provider", async () => {
    const settings = makeSettings({
      AI_PROVIDER: "openai",
      AI_BASE_URL: "",
      AI_API_KEY: "sk-stored",
    });

    const result = await resolveAiConnection(settings, {
      provider: "ollama",
      apiKey: "",
    });

    expect(result.provider).toBe("ollama");
    expect(result.apiKey).toBe("local");
  });

  it("override baseURL wins over preset", async () => {
    const settings = makeSettings({
      AI_PROVIDER: "openai",
      AI_BASE_URL: "",
      AI_API_KEY: "sk-stored",
    });

    const result = await resolveAiConnection(settings, {
      baseURL: "https://override.example.com/v1",
    });

    expect(result.baseURL).toBe("https://override.example.com/v1");
  });

  it("override apiKey wins over stored key", async () => {
    const settings = makeSettings({
      AI_PROVIDER: "openai",
      AI_BASE_URL: "",
      AI_API_KEY: "sk-stored",
    });

    const result = await resolveAiConnection(settings, {
      apiKey: "sk-override",
    });

    expect(result.apiKey).toBe("sk-override");
  });

  it("masked sentinel apiKey falls back to stored key", async () => {
    const settings = makeSettings({
      AI_PROVIDER: "openai",
      AI_BASE_URL: "",
      AI_API_KEY: "sk-stored",
    });

    const result = await resolveAiConnection(settings, {
      apiKey: "••••••••",
    });

    expect(result.apiKey).toBe("sk-stored");
  });

  it("blank override apiKey falls back to stored key", async () => {
    const settings = makeSettings({
      AI_PROVIDER: "openai",
      AI_BASE_URL: "",
      AI_API_KEY: "sk-stored",
    });

    const result = await resolveAiConnection(settings, {
      apiKey: "",
    });

    expect(result.apiKey).toBe("sk-stored");
  });

  it("empty baseURL override falls back to preset", async () => {
    const settings = makeSettings({
      AI_PROVIDER: "openai",
      AI_BASE_URL: "",
      AI_API_KEY: "sk-stored",
    });

    const result = await resolveAiConnection(settings, {
      baseURL: "   ",
    });

    expect(result.baseURL).toBe("https://api.openai.com/v1");
  });

  it("override provider is normalized", async () => {
    const settings = makeSettings({
      AI_PROVIDER: "openai",
      AI_BASE_URL: "",
      AI_API_KEY: "sk-stored",
    });

    const result = await resolveAiConnection(settings, {
      provider: "unknown-provider",
    });

    expect(result.provider).toBe("openai");
  });

  it("no overrides behaves exactly as before", async () => {
    const settings = makeSettings({
      AI_PROVIDER: "openai",
      AI_BASE_URL: "",
      AI_API_KEY: "sk-test",
    });

    const result = await resolveAiConnection(settings);

    expect(result.provider).toBe("openai");
    expect(result.baseURL).toBe("https://api.openai.com/v1");
    expect(result.apiKey).toBe("sk-test");
  });
});
