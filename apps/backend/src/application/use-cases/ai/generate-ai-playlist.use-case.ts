import {
  PlaylistTypeEnum,
  type AiPlaylistErrorCode,
  type AiPlaylistProgressEvent,
} from "@spotiarr/shared";
import type { AiChatPort } from "@/application/ports/ai-chat.port";
import { Playlist } from "@/domain/entities/playlist.entity";
import { AiChatError } from "@/domain/errors/ai-chat.error";
import type { EventBus } from "@/domain/events/event-bus";
import type { PlaylistRepository } from "@/domain/repositories/playlist.repository";
import { logger } from "@/infrastructure/logging/logger";
import type { TrackService } from "../../services/track.service";
import type {
  AppendChatMessageInput,
  AppendChatMessageUseCase,
} from "./append-chat-message.use-case";

const log = logger.child({ component: "generate-ai-playlist" });

const MAX_TRACKS = 50;
const AI_PLAYLIST_OWNER = "SpotiArr AI";
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
  playlistRepository: Pick<PlaylistRepository, "save">;
  trackService: Pick<TrackService, "create">;
  eventBus: EventBus;
  onProgress?: (event: AiPlaylistProgressEvent) => void;
  appendChatMessage?:
    | Pick<AppendChatMessageUseCase, "execute">
    | { execute: (input: AppendChatMessageInput) => Promise<void> };
  delayMs?: number;
}

export class GenerateAiPlaylistUseCase {
  private readonly aiChatPort: AiChatPort;
  private readonly resolveTrackUrl: (title: string, artist: string) => Promise<string | null>;
  private readonly playlistRepository: Pick<PlaylistRepository, "save">;
  private readonly trackService: Pick<TrackService, "create">;
  private readonly eventBus: EventBus;
  private readonly onProgress: (event: AiPlaylistProgressEvent) => void;
  private readonly appendChatMessage: (input: AppendChatMessageInput) => Promise<void>;
  private readonly resolveDelayMs: number;

  constructor(deps: UseCaseDeps) {
    this.aiChatPort = deps.aiChatPort;
    this.resolveTrackUrl = deps.resolveTrackUrl;
    this.playlistRepository = deps.playlistRepository;
    this.trackService = deps.trackService;
    this.eventBus = deps.eventBus;
    this.onProgress = deps.onProgress ?? (() => {});
    this.appendChatMessage = deps.appendChatMessage
      ? (input) => deps.appendChatMessage!.execute(input)
      : async () => {};
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
      // Fire-and-forget: do not block the critical path waiting for DB write
      this.appendChatMessage({
        role: "user",
        contentKey: "aiChat.userPrompt",
        contentParams: { prompt },
      }).catch((err) => {
        log.error({ err }, "appendChatMessage(user) failed");
      });

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

        this.appendChatMessage({
          role: "assistant",
          contentKey: "aiChat.assistantError",
          contentParams: { code: "zero-resolved" },
          errorCode: "zero-resolved",
        }).catch((err) => {
          log.error({ err }, "appendChatMessage(zero-resolved) failed");
        });

        return;
      }

      emit("saving", { progress: 0 });

      const syntheticUrl = `spotiarr://ai/${jobId}`;
      const playlistName = prompt.slice(0, 80);
      const playlistId = crypto.randomUUID();

      const playlist = new Playlist({
        id: playlistId,
        name: playlistName,
        type: PlaylistTypeEnum.Ai,
        spotifyUrl: syntheticUrl,
        owner: AI_PLAYLIST_OWNER,
        subscribed: false,
        createdAt: Date.now(),
      });

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
        playlistId,
        playlistName,
      });

      this.appendChatMessage({
        role: "assistant",
        contentKey: "aiChat.assistantDone",
        contentParams: { count: deduped.length },
        playlistId,
      }).catch((err) => {
        log.error({ err }, "appendChatMessage(done) failed");
      });
    } catch (err) {
      log.error({ err }, "generateTracks failed");
      const code =
        err instanceof AiChatError ? (err.code as AiPlaylistErrorCode) : "provider-unreachable";
      const message = err instanceof Error ? err.message : String(err);

      emit("error", {
        progress: 0,
        error: { code, message },
      });

      this.appendChatMessage({
        role: "assistant",
        contentKey: "aiChat.assistantError",
        contentParams: { code },
        errorCode: code,
      }).catch((appendErr) => {
        log.error({ err: appendErr }, "appendChatMessage(error) failed");
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
