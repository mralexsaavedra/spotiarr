import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SettingsService } from "@/application/services/settings.service";
import { listAiModels, type FetchFn } from "./list-ai-models";

const makeSettings = (values: Record<string, string>) =>
  ({
    getString: vi.fn(async (key: string, fallback = "") => values[key] ?? fallback),
  }) as unknown as SettingsService;

const configuredSettings = makeSettings({
  AI_PROVIDER: "openai",
  AI_BASE_URL: "",
  AI_API_KEY: "sk-test",
  AI_MODEL: "gpt-4o",
});

const ollamaSettings = makeSettings({
  AI_PROVIDER: "ollama",
  AI_BASE_URL: "",
  AI_API_KEY: "",
  AI_MODEL: "llama3",
});

const misconfiguredSettings = makeSettings({
  AI_PROVIDER: "openai",
  AI_BASE_URL: "",
  AI_API_KEY: "",
  AI_MODEL: "",
});

function makeFetchMock(status: number, body: unknown): FetchFn {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response);
}

describe("listAiModels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns sorted unique model ids from a successful response", async () => {
    const fetchMock = makeFetchMock(200, {
      data: [{ id: "gpt-4o" }, { id: "gpt-3.5-turbo" }, { id: "gpt-4o" }],
    });

    const result = await listAiModels(configuredSettings, fetchMock);

    expect(result).toEqual(["gpt-3.5-turbo", "gpt-4o"]);
  });

  it("returns empty array when data is missing from response", async () => {
    const fetchMock = makeFetchMock(200, {});

    const result = await listAiModels(configuredSettings, fetchMock);

    expect(result).toEqual([]);
  });

  it("returns empty array when data array is empty", async () => {
    const fetchMock = makeFetchMock(200, { data: [] });

    const result = await listAiModels(configuredSettings, fetchMock);

    expect(result).toEqual([]);
  });

  it("throws provider-unreachable on non-2xx response", async () => {
    const fetchMock = makeFetchMock(401, { error: "unauthorized" });

    await expect(listAiModels(configuredSettings, fetchMock)).rejects.toMatchObject({
      code: "provider-unreachable",
    });
  });

  it("throws provider-unreachable on network error", async () => {
    const fetchMock: FetchFn = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    await expect(listAiModels(configuredSettings, fetchMock)).rejects.toMatchObject({
      code: "provider-unreachable",
    });
  });

  it("throws provider-misconfig when provider is not configured", async () => {
    const fetchMock = makeFetchMock(200, { data: [] });

    await expect(listAiModels(misconfiguredSettings, fetchMock)).rejects.toMatchObject({
      code: "provider-misconfig",
    });
  });

  it("sends Authorization header with apiKey", async () => {
    const fetchMock = makeFetchMock(200, { data: [{ id: "gpt-4o" }] });

    await listAiModels(configuredSettings, fetchMock);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/models"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer sk-test",
        }),
      }),
    );
  });

  it("calls {baseURL}/models endpoint", async () => {
    const fetchMock = makeFetchMock(200, { data: [{ id: "llama3" }] });

    await listAiModels(ollamaSettings, fetchMock);

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:11434/v1/models", expect.any(Object));
  });
});
