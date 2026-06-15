import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseSettingsController = vi.fn();

vi.mock("@/hooks/controllers/useSettingsController", () => ({
  useSettingsController: () => mockUseSettingsController(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
  }),
}));

vi.mock("@/components/organisms/SpotifyAuthCard", () => ({ SpotifyAuthCard: () => null }));
vi.mock("@/components/layouts/AppFooter", () => ({ AppFooter: () => null }));

const aiSettings = {
  AI: [
    {
      key: "AI_PROVIDER",
      component: "select",
      section: "AI",
      options: ["openai", "custom"],
      label: "AI Provider",
      description: "",
      defaultValue: "openai",
      type: "string",
    },
    {
      key: "AI_BASE_URL",
      component: "input",
      section: "AI",
      label: "AI Base URL",
      description: "",
      defaultValue: "",
      type: "string",
    },
  ],
};

const baseController = {
  settings: aiSettings,
  values: {} as Record<string, string>,
  isLoading: false,
  isSaving: false,
  handleSubmit: vi.fn((e: { preventDefault: () => void }) => e.preventDefault()),
  handleChange: () => vi.fn(),
  handleReset: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseSettingsController.mockReturnValue(baseController);
});

const { Settings } = await import("./Settings");

describe("Settings — AI base URL field", () => {
  it("disables base URL and shows the default provider preset as placeholder when nothing is saved", () => {
    render(<Settings />);

    const baseUrl = screen.getByLabelText("AI Base URL") as HTMLInputElement;
    expect(baseUrl.disabled).toBe(true);
    expect(baseUrl.getAttribute("placeholder")).toBe("https://api.openai.com/v1");
  });

  it("enables base URL with no placeholder when provider is custom", () => {
    mockUseSettingsController.mockReturnValue({
      ...baseController,
      values: { AI_PROVIDER: "custom" },
    });

    render(<Settings />);

    const baseUrl = screen.getByLabelText("AI Base URL") as HTMLInputElement;
    expect(baseUrl.disabled).toBe(false);
    expect(baseUrl.getAttribute("placeholder")).toBeNull();
  });

  it("normalizes a legacy/unknown provider value to the default preset", () => {
    mockUseSettingsController.mockReturnValue({
      ...baseController,
      values: { AI_PROVIDER: "openai-compatible" },
    });

    render(<Settings />);

    const baseUrl = screen.getByLabelText("AI Base URL") as HTMLInputElement;
    expect(baseUrl.disabled).toBe(true);
    expect(baseUrl.getAttribute("placeholder")).toBe("https://api.openai.com/v1");
  });
});
