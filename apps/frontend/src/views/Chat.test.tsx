import { type AiChatMessageDto } from "@spotiarr/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseChatController = vi.fn();
const mockUsePlaylistsQuery = vi.fn();

vi.mock("@/hooks/controllers/useChatController", () => ({
  useChatController: () => mockUseChatController(),
}));

vi.mock("@/hooks/queries/usePlaylistsQuery", () => ({
  usePlaylistsQuery: () => mockUsePlaylistsQuery(),
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
  mockUsePlaylistsQuery.mockReturnValue({ data: [], isLoading: false });
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

  // S-F-09b: enqueue failure (mutateAsync rejection) renders the error block in Chat.tsx
  // The catch block must set stage="error" — without it, showEphemeralError is false and the
  // error div is never rendered even though error state is non-null.
  it("renders enqueue-failure error when stage is error and error is set (no ephemeral suppression)", () => {
    mockUseChatController.mockReturnValue({
      ...defaultController,
      stage: "error",
      error: { code: "provider-unreachable", message: "Connection refused" },
      // displayMessages is empty — no persisted assistant error message yet,
      // so showEphemeralError must be true and the error block must be visible
      displayMessages: [],
    });
    render(<Chat />);
    expect(screen.getByText(/ai\.errors\.provider-unreachable/)).toBeDefined();
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

  // S-F-12: renders playlist link for assistant done message when playlistId exists in library
  it("renders playlist link for assistant done message with playlistId present in playlists data", () => {
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
    mockUsePlaylistsQuery.mockReturnValue({
      data: [{ id: "pid-1", name: "My Playlist" }],
      isLoading: false,
    });
    render(<Chat />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toContain("pid-1");
  });

  // S-F-13a: stale playlist (playlistId present but NOT in playlists data) renders non-navigable with aria-label
  it("renders non-navigable element with aria-label when playlistId is not found in playlists data", () => {
    const assistantMsg: AiChatMessageDto = {
      id: "m1",
      role: "assistant",
      content: { key: "aiChat.assistantDone", params: { count: 5 } },
      playlistId: "pid-gone",
      errorCode: null,
      createdAt: 1000,
    };
    mockUseChatController.mockReturnValue({
      ...defaultController,
      displayMessages: [assistantMsg],
    });
    mockUsePlaylistsQuery.mockReturnValue({ data: [], isLoading: false });
    render(<Chat />);
    // No navigable link should be present
    expect(screen.queryByRole("link")).toBeNull();
    // A non-navigable element with the aria-label must be rendered
    const staleEl = screen.getByLabelText("aiChat.playlistGone");
    expect(staleEl).toBeDefined();
  });

  // S-F-13b: while playlists are loading, render the active link (avoid false-disabled flicker)
  it("renders active link while playlists are still loading (avoids false-disabled flicker)", () => {
    const assistantMsg: AiChatMessageDto = {
      id: "m1",
      role: "assistant",
      content: { key: "aiChat.assistantDone", params: { count: 5 } },
      playlistId: "pid-loading",
      errorCode: null,
      createdAt: 1000,
    };
    mockUseChatController.mockReturnValue({
      ...defaultController,
      displayMessages: [assistantMsg],
    });
    mockUsePlaylistsQuery.mockReturnValue({ data: undefined, isLoading: true });
    render(<Chat />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toContain("pid-loading");
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

  // S-F-17: ephemeral done block is hidden when transcript already contains the persisted assistant message
  it("hides ephemeral done block when transcript already has assistant message with matching playlistId", () => {
    const persistedAssistantMsg: AiChatMessageDto = {
      id: "srv-assistant-1",
      role: "assistant",
      content: { key: "aiChat.assistantDone", params: { count: 5 } },
      playlistId: "pid-1",
      errorCode: null,
      createdAt: 2000,
    };
    mockUseChatController.mockReturnValue({
      ...defaultController,
      stage: "done",
      resolvedCount: 5,
      playlistId: "pid-1",
      displayMessages: [persistedAssistantMsg],
    });
    render(<Chat />);
    // The ephemeral done card (tracks added) must NOT be rendered — the transcript has it
    expect(screen.queryByText(/ai\.result\.tracksAdded/)).toBeNull();
  });

  // S-F-18: ephemeral done block is visible when transcript does NOT have matching assistant message
  it("shows ephemeral done block when transcript does not yet have the persisted assistant message", () => {
    mockUseChatController.mockReturnValue({
      ...defaultController,
      stage: "done",
      resolvedCount: 5,
      playlistId: "pid-new",
      displayMessages: [],
    });
    render(<Chat />);
    expect(screen.getByText(/ai\.result\.tracksAdded/)).toBeDefined();
  });

  // S-F-19: ephemeral error block is hidden when transcript already has assistant error message with matching errorCode
  it("hides ephemeral error block when transcript already has assistant message with matching errorCode", () => {
    const persistedErrorMsg: AiChatMessageDto = {
      id: "srv-error-1",
      role: "assistant",
      content: { key: "aiChat.assistantError", params: { code: "provider-misconfig" } },
      playlistId: null,
      errorCode: "provider-misconfig",
      createdAt: 2000,
    };
    mockUseChatController.mockReturnValue({
      ...defaultController,
      stage: "error",
      error: { code: "provider-misconfig", message: "Missing API key" },
      displayMessages: [persistedErrorMsg],
    });
    render(<Chat />);
    expect(screen.queryByText(/ai\.errors\.provider-misconfig/)).toBeNull();
  });

  // S-F-20: ephemeral error block is visible when transcript does NOT have matching error message
  it("shows ephemeral error block when transcript does not yet have the persisted error message", () => {
    mockUseChatController.mockReturnValue({
      ...defaultController,
      stage: "error",
      error: { code: "provider-misconfig", message: "Missing API key" },
      displayMessages: [],
    });
    render(<Chat />);
    expect(screen.getByText(/ai\.errors\.provider-misconfig/)).toBeDefined();
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
