import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { aiChatService } from "@/services/aiChat.service";

vi.mock("@/services/aiChat.service", () => ({
  aiChatService: {
    getModels: vi.fn(),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number; defaultValue?: string }) => {
      if (key === "settings.items.AI_MODEL.loadModels") return "Load models";
      if (key === "settings.items.AI_MODEL.loadingModels") return "Loading...";
      if (key === "settings.items.AI_MODEL.modelsLoaded") return `${opts?.count} models loaded`;
      if (key === "settings.items.AI_MODEL.modelsEmpty")
        return "No models returned. Type a model name manually.";
      if (key === "settings.items.AI_MODEL.modelsError")
        return "Could not load models. Check your provider settings.";
      return opts?.defaultValue ?? key;
    },
  }),
}));

const { AiModelField } = await import("./AiModelField");

describe("AiModelField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the text input and Load models button", () => {
    render(
      <AiModelField
        id="AI_MODEL"
        label="AI Model"
        value="gpt-4o"
        onChange={vi.fn()}
        description="Model description"
      />,
    );

    expect(screen.getByLabelText("AI Model")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Load models" })).toBeTruthy();
  });

  it("input is free-text (not disabled by default)", () => {
    render(
      <AiModelField id="AI_MODEL" label="AI Model" value="" onChange={vi.fn()} description="" />,
    );

    const input = screen.getByLabelText("AI Model") as HTMLInputElement;
    expect(input.disabled).toBe(false);
  });

  it("clicking Load models triggers getModels and fills datalist", async () => {
    vi.mocked(aiChatService.getModels).mockResolvedValueOnce(["gpt-4o", "gpt-3.5-turbo"]);

    render(
      <AiModelField id="AI_MODEL" label="AI Model" value="" onChange={vi.fn()} description="" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Load models" }));

    await waitFor(() => {
      expect(screen.getByText("2 models loaded")).toBeTruthy();
    });

    const datalist = document.getElementById("AI_MODEL-models-list");
    expect(datalist).not.toBeNull();
    const options = datalist?.querySelectorAll("option");
    expect(options?.length).toBe(2);
    expect(options?.[0].value).toBe("gpt-4o");
    expect(options?.[1].value).toBe("gpt-3.5-turbo");
  });

  it("shows loading state while fetching", async () => {
    let resolve: (v: string[]) => void;
    vi.mocked(aiChatService.getModels).mockReturnValueOnce(
      new Promise<string[]>((r) => {
        resolve = r;
      }),
    );

    render(
      <AiModelField id="AI_MODEL" label="AI Model" value="" onChange={vi.fn()} description="" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Load models" }));

    expect(screen.getByText("Loading...")).toBeTruthy();
    const btn = screen.getByRole("button", { name: "Loading..." }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);

    resolve!(["gpt-4o"]);
    await waitFor(() => {
      expect(screen.getByText("1 models loaded")).toBeTruthy();
    });
  });

  it("shows error message when getModels fails", async () => {
    vi.mocked(aiChatService.getModels).mockRejectedValueOnce(new Error("Provider unreachable"));

    render(
      <AiModelField id="AI_MODEL" label="AI Model" value="" onChange={vi.fn()} description="" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Load models" }));

    await waitFor(() => {
      expect(screen.getByText("Could not load models. Check your provider settings.")).toBeTruthy();
    });

    const input = screen.getByLabelText("AI Model") as HTMLInputElement;
    expect(input.disabled).toBe(false);
  });

  it("shows empty message when getModels returns no models", async () => {
    vi.mocked(aiChatService.getModels).mockResolvedValueOnce([]);

    render(
      <AiModelField id="AI_MODEL" label="AI Model" value="" onChange={vi.fn()} description="" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Load models" }));

    await waitFor(() => {
      expect(screen.getByText("No models returned. Type a model name manually.")).toBeTruthy();
    });
  });

  it("does not auto-fetch on mount", () => {
    render(
      <AiModelField id="AI_MODEL" label="AI Model" value="" onChange={vi.fn()} description="" />,
    );

    expect(aiChatService.getModels).not.toHaveBeenCalled();
  });
});
