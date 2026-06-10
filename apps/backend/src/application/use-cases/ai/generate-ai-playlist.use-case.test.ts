import {
  PlaylistTypeEnum,
  type AiPlaylistProgressEvent,
  type AiPlaylistStage,
} from "@spotiarr/shared";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AiChatPort, AiTrackSuggestion } from "@/application/ports/ai-chat.port";
import { AiChatError } from "@/domain/errors/ai-chat.error";
import { GenerateAiPlaylistUseCase } from "./generate-ai-playlist.use-case";

const makeTrack = (title: string, artist: string): AiTrackSuggestion => ({ title, artist });

const makeDeps = (overrides: Partial<ReturnType<typeof buildDeps>> = {}) => {
  return { ...buildDeps(), ...overrides };
};

function buildDeps() {
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

describe("GenerateAiPlaylistUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("happy path", () => {
    it("creates a playlist with all resolved tracks and emits stages in order", async () => {
      const deps = makeDeps();
      const suggestions = [makeTrack("Song A", "Artist A"), makeTrack("Song B", "Artist B")];
      deps.aiChatPort.generateTracks.mockResolvedValueOnce(suggestions);
      deps.resolveTrackUrl
        .mockResolvedValueOnce("spotify:track:aaa")
        .mockResolvedValueOnce("spotify:track:bbb");

      const useCase = new GenerateAiPlaylistUseCase(deps);
      await useCase.execute({ jobId: "job-1", prompt: "classic rock" });

      expect(deps.playlistRepository.save).toHaveBeenCalledOnce();
      const savedPlaylist = deps.playlistRepository.save.mock.calls[0][0];
      expect(savedPlaylist.type).toBe(PlaylistTypeEnum.Ai);
      expect(savedPlaylist.spotifyUrl).toMatch(/^spotiarr:\/\/ai\//);

      expect(deps.trackService.create).toHaveBeenCalledTimes(2);

      const stages = deps.onProgress.mock.calls.map((c) => c[0].stage);
      const firstIndexOf = (stage: AiPlaylistStage) => stages.indexOf(stage);
      expect(firstIndexOf("llm")).toBeGreaterThanOrEqual(0);
      expect(firstIndexOf("llm")).toBeLessThan(firstIndexOf("validating"));
      expect(firstIndexOf("validating")).toBeLessThan(firstIndexOf("saving"));
      expect(firstIndexOf("saving")).toBeLessThan(firstIndexOf("done"));

      expect(deps.eventBus.emit).toHaveBeenCalledWith("playlists-updated");

      const doneEvent = deps.onProgress.mock.calls.find((c) => c[0].stage === "done")?.[0];
      expect(doneEvent?.resolvedCount).toBe(2);
      expect(doneEvent?.droppedTitles).toEqual([]);
    });
  });

  describe("partial resolution", () => {
    it("creates playlist with only resolved tracks and reports dropped titles", async () => {
      const deps = makeDeps();
      deps.aiChatPort.generateTracks.mockResolvedValueOnce([
        makeTrack("Resolved Song", "Artist A"),
        makeTrack("Unresolved Song", "Artist B"),
      ]);
      deps.resolveTrackUrl.mockResolvedValueOnce("spotify:track:aaa").mockResolvedValueOnce(null);

      const useCase = new GenerateAiPlaylistUseCase(deps);
      await useCase.execute({ jobId: "job-2", prompt: "test" });

      expect(deps.trackService.create).toHaveBeenCalledOnce();
      const doneEvent = deps.onProgress.mock.calls.find((c) => c[0].stage === "done")?.[0];
      expect(doneEvent?.resolvedCount).toBe(1);
      expect(doneEvent?.droppedTitles).toEqual(["Unresolved Song"]);
    });
  });

  describe("zero resolved", () => {
    it("does not create a playlist and emits error stage with zero-resolved code", async () => {
      const deps = makeDeps();
      deps.aiChatPort.generateTracks.mockResolvedValueOnce([
        makeTrack("Ghost Track", "Phantom Artist"),
      ]);
      deps.resolveTrackUrl.mockResolvedValueOnce(null);

      const useCase = new GenerateAiPlaylistUseCase(deps);
      await useCase.execute({ jobId: "job-3", prompt: "impossible" });

      expect(deps.playlistRepository.save).not.toHaveBeenCalled();
      expect(deps.trackService.create).not.toHaveBeenCalled();

      const errorEvent = deps.onProgress.mock.calls.find((c) => c[0].stage === "error")?.[0];
      expect(errorEvent?.error?.code).toBe("zero-resolved");
    });
  });

  describe("cap enforcement", () => {
    it("caps tracks at 50 before resolving", async () => {
      const deps = makeDeps();
      const suggestions = Array.from({ length: 60 }, (_, i) =>
        makeTrack(`Song ${i}`, `Artist ${i}`),
      );
      deps.aiChatPort.generateTracks.mockResolvedValueOnce(suggestions);
      deps.resolveTrackUrl.mockImplementation(
        async (title) => `spotify:track:${title.replace(" ", "-")}`,
      );

      const useCase = new GenerateAiPlaylistUseCase({ ...deps, delayMs: 0 });
      await useCase.execute({ jobId: "job-4", prompt: "big list" });

      expect(deps.resolveTrackUrl).toHaveBeenCalledTimes(50);
      expect(deps.trackService.create).toHaveBeenCalledTimes(50);
    });
  });

  describe("provider error propagation", () => {
    it("emits error stage with provider error code when aiChatPort throws", async () => {
      const deps = makeDeps();
      deps.aiChatPort.generateTracks.mockRejectedValueOnce(
        new AiChatError("provider-unreachable", "network down"),
      );

      const useCase = new GenerateAiPlaylistUseCase(deps);
      await useCase.execute({ jobId: "job-5", prompt: "test" });

      expect(deps.playlistRepository.save).not.toHaveBeenCalled();
      const errorEvent = deps.onProgress.mock.calls.find((c) => c[0].stage === "error")?.[0];
      expect(errorEvent?.error?.code).toBe("provider-unreachable");
    });

    it("emits error stage with llm-bad-output code on bad output error", async () => {
      const deps = makeDeps();
      deps.aiChatPort.generateTracks.mockRejectedValueOnce(
        new AiChatError("llm-bad-output", "schema mismatch"),
      );

      const useCase = new GenerateAiPlaylistUseCase(deps);
      await useCase.execute({ jobId: "job-6", prompt: "test" });

      const errorEvent = deps.onProgress.mock.calls.find((c) => c[0].stage === "error")?.[0];
      expect(errorEvent?.error?.code).toBe("llm-bad-output");
    });
  });

  describe("deduplication", () => {
    it("deduplicates tracks by resolved URL before creating", async () => {
      const deps = makeDeps();
      deps.aiChatPort.generateTracks.mockResolvedValueOnce([
        makeTrack("Same Song", "Artist"),
        makeTrack("Same Song Again", "Artist"),
      ]);
      deps.resolveTrackUrl.mockResolvedValue("spotify:track:same-url");

      const useCase = new GenerateAiPlaylistUseCase(deps);
      await useCase.execute({ jobId: "job-7", prompt: "dupes" });

      expect(deps.trackService.create).toHaveBeenCalledTimes(1);
    });
  });
});
