import {
  PlaylistTypeEnum,
  type AiPlaylistErrorCode,
  type AiPlaylistProgressEvent,
} from "@spotiarr/shared";
import type { AiChatPort } from "@/application/ports/ai-chat.port";
import { AiChatError } from "@/domain/errors/ai-chat.error";
import type { EventBus } from "@/domain/events/event-bus";
import type { PlaylistRepository } from "@/domain/repositories/playlist.repository";
import type { TrackService } from "../../services/track.service";

const MAX_TRACKS = 50;
const RESOLVE_MAX_CONCURRENCY = 2;
const RESOLVE_INTERVAL_MS = 300;

interface ResolvedTrack {
  title: string;
  artist: string;
  trackUrl: string;
}

interface UseCaseInput {
  jobId: string;
  prompt: string;
}

interface UseCaseDeps {
  aiChatPort: AiChatPort;
  resolveTrackUrl: (title: string, artist: string) => Promise<string | null>;
  playlistRepository: PlaylistRepository;
  trackService: Pick<TrackService, "create">;
  eventBus: EventBus;
  onProgress?: (event: AiPlaylistProgressEvent) => void;
  delayMs?: number;
}

export class GenerateAiPlaylistUseCase {
  private readonly aiChatPort: AiChatPort;
  private readonly resolveTrackUrl: (title: string, artist: string) => Promise<string | null>;
  private readonly playlistRepository: PlaylistRepository;
  private readonly trackService: Pick<TrackService, "create">;
  private readonly eventBus: EventBus;
  private readonly onProgress: (event: AiPlaylistProgressEvent) => void;
  private readonly resolveDelayMs: number;

  constructor(deps: UseCaseDeps) {
    this.aiChatPort = deps.aiChatPort;
    this.resolveTrackUrl = deps.resolveTrackUrl;
    this.playlistRepository = deps.playlistRepository;
    this.trackService = deps.trackService;
    this.eventBus = deps.eventBus;
    this.onProgress = deps.onProgress ?? (() => {});
    this.resolveDelayMs = deps.delayMs ?? RESOLVE_INTERVAL_MS;
  }

  async execute(input: UseCaseInput): Promise<void> {
    const { jobId, prompt } = input;

    const emit = (
      stage: AiPlaylistProgressEvent["stage"],
      extra?: Partial<AiPlaylistProgressEvent>,
    ) => {
      this.onProgress({ jobId, stage, progress: 0, ...extra });
    };

    try {
      emit("llm", { progress: 0 });
      const rawSuggestions = await this.aiChatPort.generateTracks(prompt);
      const suggestions = rawSuggestions.slice(0, MAX_TRACKS);

      emit("validating", { progress: 0 });
      const resolved = await this.resolveSequentially(suggestions);
      const resolvedTracks = resolved.filter(
        (r): r is ResolvedTrack => r.trackUrl !== null,
      ) as ResolvedTrack[];

      const deduped = deduplicateByUrl(resolvedTracks);
      const droppedTitles = resolved.filter((r) => r.trackUrl === null).map((r) => r.title);

      if (deduped.length === 0) {
        emit("error", {
          progress: 0,
          error: { code: "zero-resolved", message: "No tracks could be found on Spotify" },
          droppedTitles,
        });
        return;
      }

      emit("saving", { progress: 0 });

      const syntheticUrl = `spotiarr://ai/${jobId}`;
      const playlistName = `AI: ${prompt.slice(0, 80)}`;
      const playlistId = crypto.randomUUID();

      const playlist = {
        id: playlistId,
        name: playlistName,
        type: PlaylistTypeEnum.Ai,
        spotifyUrl: syntheticUrl,
        subscribed: false,
        createdAt: new Date(),
      };

      await this.playlistRepository.save(playlist);

      for (const track of deduped) {
        await this.trackService.create({
          artist: track.artist,
          name: track.title,
          album: playlistName,
          trackUrl: track.trackUrl,
          playlistId,
        });
      }

      this.eventBus.emit("playlists-updated");

      emit("done", {
        progress: 1,
        resolvedCount: deduped.length,
        droppedTitles,
      });
    } catch (err) {
      const code =
        err instanceof AiChatError ? (err.code as AiPlaylistErrorCode) : "provider-unreachable";
      const message = err instanceof Error ? err.message : String(err);

      emit("error", {
        progress: 0,
        error: { code, message },
      });
    }
  }

  private async resolveSequentially(
    suggestions: Array<{ title: string; artist: string }>,
  ): Promise<Array<{ title: string; artist: string; trackUrl: string | null }>> {
    const results: Array<{ title: string; artist: string; trackUrl: string | null }> = [];

    for (let i = 0; i < suggestions.length; i += RESOLVE_MAX_CONCURRENCY) {
      const batch = suggestions.slice(i, i + RESOLVE_MAX_CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(async ({ title, artist }) => {
          const trackUrl = await this.resolveTrackUrl(title, artist);
          return { title, artist, trackUrl };
        }),
      );
      results.push(...batchResults);
      if (i + RESOLVE_MAX_CONCURRENCY < suggestions.length && this.resolveDelayMs > 0) {
        await delay(this.resolveDelayMs);
      }
    }

    return results;
  }
}

function deduplicateByUrl(tracks: ResolvedTrack[]): ResolvedTrack[] {
  const seen = new Set<string>();
  return tracks.filter((t) => {
    if (seen.has(t.trackUrl)) return false;
    seen.add(t.trackUrl);
    return true;
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
