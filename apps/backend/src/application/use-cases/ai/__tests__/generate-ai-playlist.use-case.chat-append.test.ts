import type { AiPlaylistProgressEvent } from "@spotiarr/shared";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AiChatPort, AiTrackSuggestion } from "@/application/ports/ai-chat.port";
import type { AppendChatMessageInput } from "../append-chat-message.use-case";
import { GenerateAiPlaylistUseCase } from "../generate-ai-playlist.use-case";

const makeTrack = (title: string, artist: string): AiTrackSuggestion => ({ title, artist });

function buildBaseDeps() {
  return {
    aiChatPort: {
      generateTracks: vi.fn<AiChatPort["generateTracks"]>(),
    } satisfies AiChatPort,
    resolveTrackUrl: vi.fn<(title: string, artist: string) => Promise<string | null>>(),
    playlistRepository: {
      findAll: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockImplementation((p) => Promise.resolve(p)),
    },
    trackService: {
      create: vi.fn().mockResolvedValue(undefined),
    },
    eventBus: {
      emit: vi.fn(),
    },
    onProgress: vi.fn<(event: AiPlaylistProgressEvent) => void>(),
  };
}

function makeAppendSpy() {
  return {
    execute: vi.fn<(input: AppendChatMessageInput) => Promise<void>>().mockResolvedValue(undefined),
  };
}

describe("GenerateAiPlaylistUseCase — chat-append behaviour", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("S-B-11 — appends user message (fire-and-forget) before emit(llm)", () => {
    it("calls appendChatMessage with role=user and correct params", async () => {
      const deps = buildBaseDeps();
      const appendChatMessage = makeAppendSpy();

      deps.aiChatPort.generateTracks.mockResolvedValue([makeTrack("Track A", "Artist A")]);
      deps.resolveTrackUrl.mockResolvedValue("spotify:track:aaa");

      const useCase = new GenerateAiPlaylistUseCase({
        ...deps,
        appendChatMessage,
        delayMs: 0,
      });
      await useCase.execute({ jobId: "j1", prompt: "ambient" });

      // The user-message append must be called (fire-and-forget, order vs LLM not guaranteed)
      const userCall = appendChatMessage.execute.mock.calls.find((c) => c[0].role === "user");
      expect(userCall).toBeDefined();
      expect(userCall![0].role).toBe("user");
      expect(userCall![0].contentKey).toBe("aiChat.userPrompt");
      expect(userCall![0].contentParams).toMatchObject({ prompt: "ambient" });
    });
  });

  describe("S-B-12 — appends assistant done message after emit(done)", () => {
    it("calls appendChatMessage with role=assistant/done AFTER onProgress(done)", async () => {
      const deps = buildBaseDeps();
      const appendChatMessage = makeAppendSpy();

      const callOrder: string[] = [];
      deps.onProgress.mockImplementation((event) => {
        if (event.stage === "done") callOrder.push("onProgress:done");
      });
      appendChatMessage.execute.mockImplementation(async (input) => {
        if (input.role === "assistant") callOrder.push("append:assistant");
      });

      deps.aiChatPort.generateTracks.mockResolvedValue([makeTrack("Song", "Artist")]);
      deps.resolveTrackUrl.mockResolvedValue("spotify:track:aaa");

      const useCase = new GenerateAiPlaylistUseCase({
        ...deps,
        appendChatMessage,
        delayMs: 0,
      });
      await useCase.execute({ jobId: "j1", prompt: "ambient" });

      const savedPlaylist = deps.playlistRepository.save.mock.calls[0][0];
      const assistantCall = appendChatMessage.execute.mock.calls.find(
        (c) => c[0].role === "assistant" && c[0].contentKey === "aiChat.assistantDone",
      );
      expect(assistantCall).toBeDefined();
      expect(assistantCall![0].contentParams).toMatchObject({ count: 1 });
      expect(assistantCall![0].playlistId).toBe(savedPlaylist.id);

      // done must come before assistant append in callOrder
      const doneIndex = callOrder.indexOf("onProgress:done");
      const appendIndex = callOrder.indexOf("append:assistant");
      expect(doneIndex).toBeLessThan(appendIndex);
    });
  });

  describe("S-B-13 — appends assistant error message on zero-resolved", () => {
    it("calls appendChatMessage with role=assistant/error AFTER onProgress(error)", async () => {
      const deps = buildBaseDeps();
      const appendChatMessage = makeAppendSpy();

      const callOrder: string[] = [];
      deps.onProgress.mockImplementation((event) => {
        if (event.stage === "error") callOrder.push("onProgress:error");
      });
      appendChatMessage.execute.mockImplementation(async (input) => {
        if (input.role === "assistant") callOrder.push("append:assistant");
      });

      deps.aiChatPort.generateTracks.mockResolvedValue([makeTrack("Ghost", "Phantom")]);
      deps.resolveTrackUrl.mockResolvedValue(null);

      const useCase = new GenerateAiPlaylistUseCase({
        ...deps,
        appendChatMessage,
        delayMs: 0,
      });
      await useCase.execute({ jobId: "j2", prompt: "impossible" });

      const assistantCall = appendChatMessage.execute.mock.calls.find(
        (c) => c[0].role === "assistant" && c[0].contentKey === "aiChat.assistantError",
      );
      expect(assistantCall).toBeDefined();
      expect(assistantCall![0].errorCode).toBe("zero-resolved");

      const errorIndex = callOrder.indexOf("onProgress:error");
      const appendIndex = callOrder.indexOf("append:assistant");
      expect(errorIndex).toBeLessThan(appendIndex);
    });
  });

  describe("S-B-14 — appendChatMessage failure does NOT abort generation", () => {
    it("completes generation with done stage when user-message append throws", async () => {
      const deps = buildBaseDeps();
      const appendChatMessage = makeAppendSpy();

      // First call (user message) throws; subsequent calls succeed
      appendChatMessage.execute
        .mockRejectedValueOnce(new Error("DB failure"))
        .mockResolvedValue(undefined);

      deps.aiChatPort.generateTracks.mockResolvedValue([makeTrack("Track", "Artist")]);
      deps.resolveTrackUrl.mockResolvedValue("spotify:track:aaa");

      const useCase = new GenerateAiPlaylistUseCase({
        ...deps,
        appendChatMessage,
        delayMs: 0,
      });

      // Must not throw
      await expect(useCase.execute({ jobId: "j3", prompt: "jazz" })).resolves.toBeUndefined();

      // Generation must still complete
      const doneEvent = deps.onProgress.mock.calls.find((c) => c[0].stage === "done")?.[0];
      expect(doneEvent).toBeDefined();
    });
  });

  describe("S-B-15 — existing tests pass without appendChatMessage", () => {
    it("runs without appendChatMessage dep and still emits done", async () => {
      const deps = buildBaseDeps();
      deps.aiChatPort.generateTracks.mockResolvedValue([makeTrack("Song", "Artist")]);
      deps.resolveTrackUrl.mockResolvedValue("spotify:track:aaa");

      const useCase = new GenerateAiPlaylistUseCase({ ...deps, delayMs: 0 });
      await expect(useCase.execute({ jobId: "j4", prompt: "test" })).resolves.toBeUndefined();

      const doneEvent = deps.onProgress.mock.calls.find((c) => c[0].stage === "done")?.[0];
      expect(doneEvent).toBeDefined();
    });
  });
});
