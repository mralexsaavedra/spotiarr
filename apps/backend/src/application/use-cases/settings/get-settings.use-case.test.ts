import { describe, expect, it, vi } from "vitest";
import { GetSettingsUseCase, MASKED_SENTINEL } from "./get-settings.use-case";

function makeRepository(items: { key: string; value: string }[] = []) {
  return {
    findAll: vi.fn().mockResolvedValue(items),
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };
}

describe("GetSettingsUseCase", () => {
  it("masks AI_API_KEY when stored value is non-empty", async () => {
    const repo = makeRepository([{ key: "AI_API_KEY", value: "sk-real-key" }]);
    const useCase = new GetSettingsUseCase(repo);

    const result = await useCase.execute();

    const item = result.find((s) => s.key === "AI_API_KEY");
    expect(item).toBeDefined();
    expect(item!.value).toBe(MASKED_SENTINEL);
    expect(item!.value).not.toBe("sk-real-key");
  });

  it("returns empty string for AI_API_KEY when not set", async () => {
    const repo = makeRepository([{ key: "AI_API_KEY", value: "" }]);
    const useCase = new GetSettingsUseCase(repo);

    const result = await useCase.execute();

    const item = result.find((s) => s.key === "AI_API_KEY");
    expect(item).toBeDefined();
    expect(item!.value).toBe("");
  });

  it("does not mask non-secret settings", async () => {
    const repo = makeRepository([
      { key: "AI_MODEL", value: "gpt-4o" },
      { key: "AI_BASE_URL", value: "https://api.openai.com/v1" },
      { key: "UI_LANGUAGE", value: "en" },
    ]);
    const useCase = new GetSettingsUseCase(repo);

    const result = await useCase.execute();

    expect(result.find((s) => s.key === "AI_MODEL")!.value).toBe("gpt-4o");
    expect(result.find((s) => s.key === "AI_BASE_URL")!.value).toBe("https://api.openai.com/v1");
    expect(result.find((s) => s.key === "UI_LANGUAGE")!.value).toBe("en");
  });

  it("masks all secret keys when multiple are present", async () => {
    const repo = makeRepository([
      { key: "AI_API_KEY", value: "sk-real-key" },
      { key: "AI_MODEL", value: "gpt-4o" },
    ]);
    const useCase = new GetSettingsUseCase(repo);

    const result = await useCase.execute();

    expect(result.find((s) => s.key === "AI_API_KEY")!.value).toBe(MASKED_SENTINEL);
    expect(result.find((s) => s.key === "AI_MODEL")!.value).toBe("gpt-4o");
  });
});
