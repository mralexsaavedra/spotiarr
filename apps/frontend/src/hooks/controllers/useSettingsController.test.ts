import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockSettingsData: { key: string; value: string }[] = [];
const mockMetadata: Record<
  string,
  {
    key: string;
    defaultValue: string;
    section: string;
    component: string;
    type: string;
    label: string;
    description: string;
  }
> = {
  AI_PROVIDER: {
    key: "AI_PROVIDER",
    defaultValue: "openai",
    section: "AI",
    component: "select",
    type: "string",
    label: "AI Provider",
    description: "",
  },
  AI_BASE_URL: {
    key: "AI_BASE_URL",
    defaultValue: "",
    section: "AI",
    component: "input",
    type: "string",
    label: "AI Base URL",
    description: "",
  },
};

vi.mock("@/hooks/queries/useSettingsQuery", () => ({
  useSettingsQuery: () => ({ data: mockSettingsData, isLoading: false }),
}));

vi.mock("@/hooks/queries/useSettingsMetadataQuery", () => ({
  useSettingsMetadataQuery: () => ({ data: mockMetadata, isLoading: false }),
}));

vi.mock("@/hooks/queries/useSupportedFormatsQuery", () => ({
  useSupportedFormatsQuery: () => ({ data: ["mp3", "m4a"] }),
}));

vi.mock("@/hooks/mutations/useUpdateSettingsMutation", () => ({
  useUpdateSettingsMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const { useSettingsController } = await import("./useSettingsController");

describe("useSettingsController — AI_PROVIDER change clears AI_BASE_URL", () => {
  beforeEach(() => {
    mockSettingsData.length = 0;
  });

  it("clears AI_BASE_URL when AI_PROVIDER changes to a non-custom value", () => {
    const { result } = renderHook(() => useSettingsController());

    act(() => {
      result.current.handleChange("AI_BASE_URL")({
        target: { value: "https://my-custom-server.com/v1" },
      } as any);
    });

    expect(result.current.values["AI_BASE_URL"]).toBe("https://my-custom-server.com/v1");

    act(() => {
      result.current.handleChange("AI_PROVIDER")({
        target: { value: "openai" },
      } as any);
    });

    expect(result.current.values["AI_PROVIDER"]).toBe("openai");
    expect(result.current.values["AI_BASE_URL"]).toBe("");
  });

  it("does not clear AI_BASE_URL when AI_PROVIDER changes to custom", () => {
    const { result } = renderHook(() => useSettingsController());

    act(() => {
      result.current.handleChange("AI_BASE_URL")({
        target: { value: "https://my-server.com/v1" },
      } as any);
    });

    act(() => {
      result.current.handleChange("AI_PROVIDER")({
        target: { value: "custom" },
      } as any);
    });

    expect(result.current.values["AI_PROVIDER"]).toBe("custom");
    expect(result.current.values["AI_BASE_URL"]).toBe("https://my-server.com/v1");
  });

  it("clears AI_BASE_URL when AI_PROVIDER changes from custom to a preset", () => {
    const { result } = renderHook(() => useSettingsController());

    act(() => {
      result.current.handleChange("AI_PROVIDER")({
        target: { value: "custom" },
      } as any);
      result.current.handleChange("AI_BASE_URL")({
        target: { value: "https://my-server.com/v1" },
      } as any);
    });

    act(() => {
      result.current.handleChange("AI_PROVIDER")({
        target: { value: "groq" },
      } as any);
    });

    expect(result.current.values["AI_BASE_URL"]).toBe("");
  });
});
