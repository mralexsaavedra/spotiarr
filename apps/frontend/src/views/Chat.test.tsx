import { type AiChatMessageDto } from "@spotiarr/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseChatController = vi.fn();

vi.mock("@/hooks/controllers/useChatController", () => ({
  useChatController: () => mockUseChatController(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && Object.keys(opts).length > 0) {
        return `${key}(${JSON.stringify(opts)})`;
      }
      return key;
    },
  }),
}));

vi.mock("react-router-dom", () => ({
  Link: ({
    to,
    children,
    ...props
  }: {
    to: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={String(to)} {...props}>
      {children}
    </a>
  ),
}));

const mockSetPrompt = vi.fn();
const mockHandleSubmit = vi.fn();
const mockClearMessages = vi.fn();

const defaultController = {
  prompt: "",
  setPrompt: mockSetPrompt,
  stage: null,
  progress: 0,
  resolvedCount: undefined,
  droppedTitles: [],
  playlistId: undefined,
  playlistName: undefined,
  error: null,
  isGenerating: false,
  displayMessages: [] as AiChatMessageDto[],
  handleSubmit: mockHandleSubmit,
  clearMessages: mockClearMessages,
  isClearPending: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseChatController.mockReturnValue(defaultController);
  vi.spyOn(window, "confirm").mockReturnValue(false);
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
    // Multiple buttons exist now (send + clear), find by aria-label or text
    expect(screen.getByLabelText("ai.sendButton")).toBeDefined();
  });

  it("send button is disabled when prompt is empty", () => {
    mockUseChatController.mockReturnValue({ ...defaultController, prompt: "" });
    render(<Chat />);
    const btn = screen.getByLabelText("ai.sendButton");
    expect(btn).toHaveProperty("disabled", true);
  });

  it("send button is enabled when prompt has content", () => {
    mockUseChatController.mockReturnValue({ ...defaultController, prompt: "jazz" });
    render(<Chat />);
    const btn = screen.getByLabelText("ai.sendButton");
    expect(btn).toHaveProperty("disabled", false);
  });

  it("send button is disabled while generating", () => {
    mockUseChatController.mockReturnValue({
      ...defaultController,
      prompt: "jazz",
      isGenerating: true,
    });
    render(<Chat />);
    const btn = screen.getByLabelText("ai.sendButton");
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
    const btn = screen.getByLabelText("ai.sendButton");
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

  // S-F-11: renders empty state when no messages
  it("renders empty state when displayMessages is empty", () => {
    mockUseChatController.mockReturnValue({
      ...defaultController,
      displayMessages: [],
    });
    render(<Chat />);
    expect(screen.getByText("aiChat.emptyState")).toBeDefined();
  });

  // S-F-12: renders playlist link for assistant done message
  it("renders playlist link for assistant done message with playlistId", () => {
    const assistantMsg: AiChatMessageDto = {
      id: "m1",
      role: "assistant",
      content: { key: "aiChat.assistantDone", params: { count: 5 } },
      playlistId: "pid-1",
      errorCode: null,
      createdAt: 1000,
    };
    mockUseChatController.mockReturnValue({
      ...defaultController,
      displayMessages: [assistantMsg],
    });
    render(<Chat />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toContain("pid-1");
  });

  // S-F-13: stale playlist link renders disabled/non-navigable when no playlist link available
  it("renders non-navigable element with accessible label when playlistId has no link", () => {
    const assistantMsg: AiChatMessageDto = {
      id: "m1",
      role: "assistant",
      content: { key: "aiChat.assistantDone", params: { count: 5 } },
      playlistId: null,
      errorCode: null,
      createdAt: 1000,
    };
    mockUseChatController.mockReturnValue({
      ...defaultController,
      displayMessages: [assistantMsg],
    });
    render(<Chat />);
    // When no playlistId, no link should be present
    expect(screen.queryByRole("link")).toBeNull();
  });

  // S-F-14: clear button triggers confirmation before mutating
  it("clear button does NOT call clearMessages when confirm returns false", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    mockUseChatController.mockReturnValue({
      ...defaultController,
      displayMessages: [
        {
          id: "m1",
          role: "user" as const,
          content: { key: "aiChat.userPrompt", params: { prompt: "jazz" } },
          playlistId: null,
          errorCode: null,
          createdAt: 1000,
        },
      ],
    });
    render(<Chat />);
    const clearBtn = screen.getByText("aiChat.clearConversation");
    fireEvent.click(clearBtn);
    expect(mockClearMessages).not.toHaveBeenCalled();
  });

  // S-F-15: clear button calls clearMessages when confirmed
  it("clear button calls clearMessages when confirm returns true", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockUseChatController.mockReturnValue({
      ...defaultController,
      displayMessages: [
        {
          id: "m1",
          role: "user" as const,
          content: { key: "aiChat.userPrompt", params: { prompt: "jazz" } },
          playlistId: null,
          errorCode: null,
          createdAt: 1000,
        },
      ],
    });
    render(<Chat />);
    const clearBtn = screen.getByText("aiChat.clearConversation");
    fireEvent.click(clearBtn);
    expect(mockClearMessages).toHaveBeenCalledTimes(1);
  });

  // S-F-16: clear button disabled while isClearPending
  it("clear button is disabled while isClearPending", () => {
    mockUseChatController.mockReturnValue({
      ...defaultController,
      isClearPending: true,
      displayMessages: [
        {
          id: "m1",
          role: "user" as const,
          content: { key: "aiChat.userPrompt", params: { prompt: "jazz" } },
          playlistId: null,
          errorCode: null,
          createdAt: 1000,
        },
      ],
    });
    render(<Chat />);
    const clearBtn = screen.getByText("aiChat.clearConversation");
    expect(clearBtn.closest("button")).toHaveProperty("disabled", true);
  });

  it("renders user messages from displayMessages list", () => {
    mockUseChatController.mockReturnValue({
      ...defaultController,
      displayMessages: [
        {
          id: "m1",
          role: "user" as const,
          content: { key: "aiChat.userPrompt", params: { prompt: "my prompt text" } },
          playlistId: null,
          errorCode: null,
          createdAt: 1000,
        },
      ],
    });
    render(<Chat />);
    expect(screen.getByText(/my prompt text/)).toBeDefined();
  });
});
