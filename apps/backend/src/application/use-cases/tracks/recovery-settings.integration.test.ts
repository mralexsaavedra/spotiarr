import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Track } from "@/domain/entities/track.entity";
import type { SettingsRepository } from "@/domain/repositories/settings.repository";
import { SettingsService } from "../../services/settings.service";
import { RecoverErroredTracksUseCase } from "./recover-errored-tracks.use-case";
import { SearchTrackOnYoutubeUseCase } from "./search-track-on-youtube.use-case";

// Integration test: wires the REAL SettingsService (unseeded — falls back to
// SETTINGS_METADATA defaults, the production-fresh path) into the recovery
// use-cases, with an in-memory track repo. This exercises the exact layer that
// the #181 incident broke: the use-cases read SEARCH_MAX_ATTEMPTS via a real
// settings service, so a missing registration would throw here — the unit
// tests that mock getNumber could never catch it.

function makeRealUnseededSettings(): SettingsService {
  const repo: SettingsRepository = {
    get: async () => undefined,
    set: async () => undefined,
    delete: async () => undefined,
  } as unknown as SettingsRepository;
  return new SettingsService(repo, () => undefined);
}

// Minimal in-memory TrackRepository covering the methods these use-cases touch.
class InMemoryTrackRepository {
  private readonly tracks = new Map<string, Track>();

  seed(track: Track): void {
    if (track.id) this.tracks.set(track.id, track);
  }

  async findOneWithPlaylist(id: string): Promise<Track | null> {
    return this.tracks.get(id) ?? null;
  }

  async update(id: string, patch: Partial<ITrack> | Track): Promise<void> {
    const existing = this.tracks.get(id);
    if (!existing) return;
    const data = patch instanceof Track ? patch.toPrimitive() : patch;
    this.tracks.set(id, new Track({ ...existing.toPrimitive(), ...data }));
  }

  async findAllByStatuses(statuses: TrackStatusEnum[]): Promise<Track[]> {
    return [...this.tracks.values()].filter((t) => statuses.includes(t.status as TrackStatusEnum));
  }

  get(id: string): Track | undefined {
    return this.tracks.get(id);
  }
}

const noopEventBus = { emit: vi.fn() };

describe("recovery use-cases with REAL SettingsService (no mocked getNumber)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SearchTrackOnYoutubeUseCase", () => {
    it("does NOT throw on a fresh install and queues a found track (regression for #181 force-Error)", async () => {
      const repo = new InMemoryTrackRepository();
      repo.seed(
        new Track({ id: "t1", name: "Song", artist: "Artist", status: TrackStatusEnum.New }),
      );

      const queue = { enqueueSearchTrack: vi.fn(), enqueueDownloadTrack: vi.fn() };
      const useCase = new SearchTrackOnYoutubeUseCase(
        repo as never,
        { findOnYoutubeOne: vi.fn().mockResolvedValue("https://youtu.be/abc") } as never,
        makeRealUnseededSettings(),
        queue as never,
        noopEventBus as never,
      );

      await expect(useCase.execute({ id: "t1" } as ITrack)).resolves.not.toThrow();

      expect(repo.get("t1")?.status).toBe(TrackStatusEnum.Queued);
      expect(queue.enqueueDownloadTrack).toHaveBeenCalledTimes(1);
    });

    it("enforces the metadata-default cap (5) without throwing", async () => {
      const repo = new InMemoryTrackRepository();
      repo.seed(
        new Track({
          id: "t2",
          name: "Song",
          artist: "Artist",
          status: TrackStatusEnum.Error,
          searchAttempts: 5,
        }),
      );

      const youtube = { findOnYoutubeOne: vi.fn() };
      const queue = { enqueueSearchTrack: vi.fn(), enqueueDownloadTrack: vi.fn() };
      const useCase = new SearchTrackOnYoutubeUseCase(
        repo as never,
        youtube as never,
        makeRealUnseededSettings(),
        queue as never,
        noopEventBus as never,
      );

      await useCase.execute({ id: "t2" } as ITrack);

      // At the cap → no search, no download; track settled as Error.
      expect(youtube.findOnYoutubeOne).not.toHaveBeenCalled();
      expect(queue.enqueueDownloadTrack).not.toHaveBeenCalled();
      expect(repo.get("t2")?.status).toBe(TrackStatusEnum.Error);
    });
  });

  describe("RecoverErroredTracksUseCase", () => {
    it("drains eligible Error tracks and skips cap-reached ones, using real settings", async () => {
      const repo = new InMemoryTrackRepository();
      repo.seed(
        new Track({
          id: "ok",
          name: "A",
          artist: "X",
          status: TrackStatusEnum.Error,
          searchAttempts: 1,
        }),
      );
      repo.seed(
        new Track({
          id: "capped",
          name: "B",
          artist: "Y",
          status: TrackStatusEnum.Error,
          searchAttempts: 5,
        }),
      );

      const retry = { execute: vi.fn() };
      const useCase = new RecoverErroredTracksUseCase(
        repo as never,
        retry as never,
        { isOpen: () => false } as never,
        makeRealUnseededSettings(),
        noopEventBus as never,
      );

      await expect(useCase.execute()).resolves.not.toThrow();

      expect(retry.execute).toHaveBeenCalledWith("ok");
      expect(retry.execute).not.toHaveBeenCalledWith("capped");
    });
  });
});
