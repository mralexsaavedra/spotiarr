/**
 * T-5.2 — Listening context forwarding tests for GenerateAiPlaylistUseCase.
 * S-14: context present → forwarded to aiChatPort.generateTracks
 * S-15: no context → prompt identical to pre-change call
 * S-16: empty context → treated as absent (identical prompt)
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AiChatPort, AiTrackSuggestion } from "@/application/ports/ai-chat.port";
import { GenerateAiPlaylistUseCase } from "../generate-ai-playlist.use-case";

const makeTrack = (title: string, artist: string): AiTrackSuggestion => ({ title, artist });

function buildDeps(generateTracksMock: ReturnType<typeof vi.fn>) {
  return {
    aiChatPort: {
      generateTracks: generateTracksMock,
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
    onProgress: vi.fn(),
  };
}

describe("GenerateAiPlaylistUseCase — listeningContext forwarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // S-14: context present → forwarded to aiChatPort.generateTracks
  it("S-14: forwards listeningContext to aiChatPort.generateTracks when provided", async () => {
    const generateTracksMock = vi
      .fn<AiChatPort["generateTracks"]>()
      .mockResolvedValue([makeTrack("Song A", "Artist A")]);

    const deps = buildDeps(generateTracksMock);
    deps.resolveTrackUrl.mockResolvedValue("spotify:track:aaa");

    const useCase = new GenerateAiPlaylistUseCase(deps);
    const context = "User's top tracks: Song A by Artist A";

    await useCase.execute({ jobId: "job-ctx", prompt: "rock playlist", listeningContext: context });

    expect(generateTracksMock).toHaveBeenCalledOnce();
    expect(generateTracksMock).toHaveBeenCalledWith("rock playlist", context);
  });

  // S-15: no context → prompt identical to pre-change (called with only prompt)
  it("S-15: calls aiChatPort.generateTracks with only prompt when listeningContext is absent", async () => {
    const generateTracksMock = vi
      .fn<AiChatPort["generateTracks"]>()
      .mockResolvedValue([makeTrack("Song B", "Artist B")]);

    const deps = buildDeps(generateTracksMock);
    deps.resolveTrackUrl.mockResolvedValue("spotify:track:bbb");

    const useCase = new GenerateAiPlaylistUseCase(deps);

    await useCase.execute({ jobId: "job-noctx", prompt: "classic rock" });

    expect(generateTracksMock).toHaveBeenCalledOnce();
    // When no listeningContext: second arg must be undefined (not an empty string or other value)
    expect(generateTracksMock).toHaveBeenCalledWith("classic rock", undefined);
  });

  // S-16: empty context → treated as absent
  it("S-16: does not forward listeningContext when it is an empty string", async () => {
    const generateTracksMock = vi
      .fn<AiChatPort["generateTracks"]>()
      .mockResolvedValue([makeTrack("Song C", "Artist C")]);

    const deps = buildDeps(generateTracksMock);
    deps.resolveTrackUrl.mockResolvedValue("spotify:track:ccc");

    const useCase = new GenerateAiPlaylistUseCase(deps);

    await useCase.execute({ jobId: "job-empty", prompt: "jazz", listeningContext: "" });

    expect(generateTracksMock).toHaveBeenCalledOnce();
    // Empty context treated as absent — second arg must be undefined
    expect(generateTracksMock).toHaveBeenCalledWith("jazz", undefined);
  });

  // REQ-LH-041: existing behavior is preserved when context is absent
  it("REQ-LH-041: existing use-case behavior (no context) is completely unchanged", async () => {
    const generateTracksMock = vi
      .fn<AiChatPort["generateTracks"]>()
      .mockResolvedValue([makeTrack("Song D", "Artist D"), makeTrack("Song E", "Artist E")]);

    const deps = buildDeps(generateTracksMock);
    deps.resolveTrackUrl
      .mockResolvedValueOnce("spotify:track:ddd")
      .mockResolvedValueOnce("spotify:track:eee");

    const useCase = new GenerateAiPlaylistUseCase(deps);
    await useCase.execute({ jobId: "job-compat", prompt: "hip hop" });

    // generateTracks must be called with exactly (prompt, undefined) — no suffix injected
    expect(generateTracksMock).toHaveBeenCalledOnce();
    expect(generateTracksMock).toHaveBeenCalledWith("hip hop", undefined);

    expect(deps.playlistRepository.save).toHaveBeenCalledOnce();
    expect(deps.trackService.create).toHaveBeenCalledTimes(2);
    expect(deps.eventBus.emit).toHaveBeenCalledWith("playlists-updated");
  });
});
