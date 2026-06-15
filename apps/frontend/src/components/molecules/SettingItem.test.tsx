import type { SettingMetadata } from "@spotiarr/shared";
import { AI_PROVIDERS } from "@spotiarr/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockT = vi.fn((key: string, opts?: { defaultValue?: string }) => {
  const map: Record<string, string> = {
    "aiProviders.openai": "OpenAI",
    "aiProviders.openrouter": "OpenRouter",
    "aiProviders.groq": "Groq",
    "aiProviders.ollama": "Ollama",
    "aiProviders.ollama-cloud": "Ollama Cloud",
    "aiProviders.lmstudio": "LM Studio",
    "aiProviders.vercel": "Vercel AI Gateway",
    "aiProviders.custom": "Custom",
  };
  return map[key] ?? opts?.defaultValue ?? key;
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
}));

vi.mock("@fortawesome/react-fontawesome", () => ({
  FontAwesomeIcon: () => null,
}));

vi.mock("@fortawesome/free-solid-svg-icons", () => ({
  faChevronDown: {},
}));

const { SettingItem } = await import("./SettingItem");

const AI_PROVIDER_SETTING: SettingMetadata = {
  key: "AI_PROVIDER",
  defaultValue: "openai",
  type: "string",
  component: "select",
  section: "AI",
  options: [...AI_PROVIDERS],
  label: "AI Provider",
  description: "The AI provider to use for playlist generation.",
};

const noop = () => () => {};

describe("SettingItem — AI_PROVIDER select label formatter", () => {
  it("renders OpenAI as the display label for openai option", () => {
    render(<SettingItem setting={AI_PROVIDER_SETTING} value="openai" onChange={noop} />);
    const option = screen.getByRole("option", { name: "OpenAI" });
    expect(option).toBeDefined();
  });

  it("renders LM Studio as the display label for lmstudio option", () => {
    render(<SettingItem setting={AI_PROVIDER_SETTING} value="openai" onChange={noop} />);
    const option = screen.getByRole("option", { name: "LM Studio" });
    expect(option).toBeDefined();
  });

  it("renders Vercel AI Gateway as the display label for vercel option", () => {
    render(<SettingItem setting={AI_PROVIDER_SETTING} value="openai" onChange={noop} />);
    const option = screen.getByRole("option", { name: "Vercel AI Gateway" });
    expect(option).toBeDefined();
  });

  it("renders Custom (translated) as the display label for custom option", () => {
    render(<SettingItem setting={AI_PROVIDER_SETTING} value="openai" onChange={noop} />);
    const option = screen.getByRole("option", { name: "Custom" });
    expect(option).toBeDefined();
  });

  it("renders Ollama Cloud as the display label for ollama-cloud option", () => {
    render(<SettingItem setting={AI_PROVIDER_SETTING} value="openai" onChange={noop} />);
    const option = screen.getByRole("option", { name: "Ollama Cloud" });
    expect(option).toBeDefined();
  });
});
