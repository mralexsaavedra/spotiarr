import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseChatController = vi.fn();

vi.mock("@/hooks/controllers/useChatController", () => ({
  useChatController: () => mockUseChatController(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockSetPrompt = vi.fn();
const mockHandleSubmit = vi.fn();

const defaultController = {
  prompt: "",
  setPrompt: mockSetPrompt,
  stage: null,
  progress: 0,
  resolvedCount: undefined,
  droppedTitles: [],
  error: null,
  isGenerating: false,
  messages: [],
  handleSubmit: mockHandleSubmit,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseChatController.mockReturnValue(defaultController);
});

const { Chat } = await import("./Chat");

describe("Chat view", () => {
  it("renders the page title", () => {
    render(<Chat />);
    expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
  });

  it("renders the prompt textarea", () => {
    render(<Chat />);
    expect(screen.getByRole("textbox")).toBeDefined();
  });

  it("renders the send button", () => {
    render(<Chat />);
    expect(screen.getByRole("button")).toBeDefined();
  });

  it("send button is disabled when prompt is empty", () => {
    mockUseChatController.mockReturnValue({ ...defaultController, prompt: "" });
    render(<Chat />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveProperty("disabled", true);
  });

  it("send button is enabled when prompt has content", () => {
    mockUseChatController.mockReturnValue({ ...defaultController, prompt: "jazz" });
    render(<Chat />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveProperty("disabled", false);
  });

  it("send button is disabled while generating", () => {
    mockUseChatController.mockReturnValue({
      ...defaultController,
      prompt: "jazz",
      isGenerating: true,
    });
    render(<Chat />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveProperty("disabled", true);
  });

  it("calls setPrompt on textarea change", () => {
    render(<Chat />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "hip hop" } });
    expect(mockSetPrompt).toHaveBeenCalledWith("hip hop");
  });

  it("calls handleSubmit when send button is clicked", () => {
    mockUseChatController.mockReturnValue({ ...defaultController, prompt: "jazz" });
    render(<Chat />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(mockHandleSubmit).toHaveBeenCalled();
  });

  it("shows current stage when generating", () => {
    mockUseChatController.mockReturnValue({
      ...defaultController,
      isGenerating: true,
      stage: "llm",
    });
    render(<Chat />);
    expect(screen.getByText("ai.stages.llm")).toBeDefined();
  });

  it("shows resolved count and dropped titles on done stage", () => {
    mockUseChatController.mockReturnValue({
      ...defaultController,
      stage: "done",
      resolvedCount: 8,
      droppedTitles: ["Ghost Song"],
    });
    render(<Chat />);
    expect(screen.getByText(/ai\.result\.tracksAdded/)).toBeDefined();
    expect(screen.getByText(/Ghost Song/)).toBeDefined();
  });

  it("shows error message on error stage", () => {
    mockUseChatController.mockReturnValue({
      ...defaultController,
      stage: "error",
      error: { code: "provider-misconfig", message: "Missing API key" },
    });
    render(<Chat />);
    expect(screen.getByText(/ai\.errors\.provider-misconfig/)).toBeDefined();
  });

  it("renders user messages from messages list", () => {
    mockUseChatController.mockReturnValue({
      ...defaultController,
      messages: [{ role: "user", text: "my prompt text" }],
    });
    render(<Chat />);
    expect(screen.getByText("my prompt text")).toBeDefined();
  });
});
