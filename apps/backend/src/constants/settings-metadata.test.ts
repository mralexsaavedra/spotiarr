import { describe, expect, it } from "vitest";
import { SETTINGS_METADATA } from "./settings-metadata";

describe("SETTINGS_METADATA — AI section", () => {
  it("includes AI_PROVIDER under section AI", () => {
    expect(SETTINGS_METADATA["AI_PROVIDER"]).toBeDefined();
    expect(SETTINGS_METADATA["AI_PROVIDER"].section).toBe("AI");
    expect(SETTINGS_METADATA["AI_PROVIDER"].component).toBe("select");
    expect(SETTINGS_METADATA["AI_PROVIDER"].secret).toBeUndefined();
  });

  it("includes AI_BASE_URL under section AI", () => {
    expect(SETTINGS_METADATA["AI_BASE_URL"]).toBeDefined();
    expect(SETTINGS_METADATA["AI_BASE_URL"].section).toBe("AI");
    expect(SETTINGS_METADATA["AI_BASE_URL"].component).toBe("input");
    expect(SETTINGS_METADATA["AI_BASE_URL"].secret).toBeUndefined();
  });

  it("includes AI_API_KEY under section AI with secret flag", () => {
    expect(SETTINGS_METADATA["AI_API_KEY"]).toBeDefined();
    expect(SETTINGS_METADATA["AI_API_KEY"].section).toBe("AI");
    expect(SETTINGS_METADATA["AI_API_KEY"].component).toBe("input");
    expect(SETTINGS_METADATA["AI_API_KEY"].secret).toBe(true);
  });

  it("includes AI_MODEL under section AI", () => {
    expect(SETTINGS_METADATA["AI_MODEL"]).toBeDefined();
    expect(SETTINGS_METADATA["AI_MODEL"].section).toBe("AI");
    expect(SETTINGS_METADATA["AI_MODEL"].component).toBe("input");
    expect(SETTINGS_METADATA["AI_MODEL"].secret).toBeUndefined();
  });

  it("all four AI keys are present in the metadata", () => {
    const aiKeys = Object.values(SETTINGS_METADATA)
      .filter((m) => m.section === "AI")
      .map((m) => m.key);

    expect(aiKeys).toContain("AI_PROVIDER");
    expect(aiKeys).toContain("AI_BASE_URL");
    expect(aiKeys).toContain("AI_API_KEY");
    expect(aiKeys).toContain("AI_MODEL");
    expect(aiKeys).toHaveLength(4);
  });
});
