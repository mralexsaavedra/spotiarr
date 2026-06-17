import { TrackStatusEnum } from "@spotiarr/shared";
import type { ITrack } from "@spotiarr/shared";
import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/domain/errors/app-error";
import type { PlaylistRepository } from "@/domain/repositories/playlist.repository";
import { RetryPlaylistDownloadsUseCase } from "./retry-playlist-downloads.use-case";

const makeTrack = (overrides: Partial<ITrack> = {}): ITrack => ({
  id: "t1",
  name: "Track",
  artist: "Artist",
  album: "Album",
  trackUrl: "https://open.spotify.com/track/1",
  albumUrl: "https://open.spotify.com/album/1",
  playlistId: "p1",
  status: TrackStatusEnum.Completed,
  ...overrides,
});

const makeDeps = () => {
  const playlistRepository: Pick<PlaylistRepository, "findOne"> = {
    findOne: vi.fn(),
  };
  const trackService = {
    getAllByPlaylist: vi.fn(),
    retry: vi.fn(),
  };
  return { playlistRepository, trackService };
};

const makeUseCase = (
  playlistRepository: Pick<PlaylistRepository, "findOne">,
  trackService: { getAllByPlaylist: ReturnType<typeof vi.fn>; retry: ReturnType<typeof vi.fn> },
) =>
  new RetryPlaylistDownloadsUseCase(
    playlistRepository as unknown as PlaylistRepository,
    trackService as never,
  );

describe("RetryPlaylistDownloadsUseCase", () => {
  it("retries only tracks with Error status", async () => {
    const { playlistRepository, trackService } = makeDeps();
    vi.mocked(playlistRepository.findOne).mockResolvedValue({ id: "p1" } as never);
    const errorTrack = makeTrack({ id: "t-err", status: TrackStatusEnum.Error });
    const okTrack = makeTrack({ id: "t-ok", status: TrackStatusEnum.Completed });
    vi.mocked(trackService.getAllByPlaylist).mockResolvedValue([errorTrack, okTrack]);
    vi.mocked(trackService.retry).mockResolvedValue(undefined);

    const useCase = makeUseCase(playlistRepository, trackService);
    await useCase.execute("p1");

    expect(trackService.retry).toHaveBeenCalledTimes(1);
    expect(trackService.retry).toHaveBeenCalledWith("t-err");
  });

  it("does not call retry when no tracks have Error status", async () => {
    const { playlistRepository, trackService } = makeDeps();
    vi.mocked(playlistRepository.findOne).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(trackService.getAllByPlaylist).mockResolvedValue([
      makeTrack({ status: TrackStatusEnum.Completed }),
    ]);

    const useCase = makeUseCase(playlistRepository, trackService);
    await useCase.execute("p1");

    expect(trackService.retry).not.toHaveBeenCalled();
  });

  it("does not call retry when track has Error status but no id", async () => {
    const { playlistRepository, trackService } = makeDeps();
    vi.mocked(playlistRepository.findOne).mockResolvedValue({ id: "p1" } as never);
    const noIdTrack = makeTrack({ id: undefined, status: TrackStatusEnum.Error });
    vi.mocked(trackService.getAllByPlaylist).mockResolvedValue([noIdTrack]);

    const useCase = makeUseCase(playlistRepository, trackService);
    await useCase.execute("p1");

    expect(trackService.retry).not.toHaveBeenCalled();
  });

  it("retries all error-status tracks with ids", async () => {
    const { playlistRepository, trackService } = makeDeps();
    vi.mocked(playlistRepository.findOne).mockResolvedValue({ id: "p1" } as never);
    const tracks = [
      makeTrack({ id: "t1", status: TrackStatusEnum.Error }),
      makeTrack({ id: "t2", status: TrackStatusEnum.Error }),
      makeTrack({ id: "t3", status: TrackStatusEnum.Error }),
    ];
    vi.mocked(trackService.getAllByPlaylist).mockResolvedValue(tracks);
    vi.mocked(trackService.retry).mockResolvedValue(undefined);

    const useCase = makeUseCase(playlistRepository, trackService);
    await useCase.execute("p1");

    expect(trackService.retry).toHaveBeenCalledTimes(3);
  });

  it("throws AppError 404 when playlist is not found", async () => {
    const { playlistRepository, trackService } = makeDeps();
    vi.mocked(playlistRepository.findOne).mockResolvedValue(null);

    const useCase = makeUseCase(playlistRepository, trackService);

    await expect(useCase.execute("missing")).rejects.toThrow(AppError);
    await expect(useCase.execute("missing")).rejects.toMatchObject({
      statusCode: 404,
      errorCode: "playlist_not_found",
    });
  });

  it("does not fetch tracks when playlist is not found", async () => {
    const { playlistRepository, trackService } = makeDeps();
    vi.mocked(playlistRepository.findOne).mockResolvedValue(null);

    const useCase = makeUseCase(playlistRepository, trackService);
    await expect(useCase.execute("missing")).rejects.toThrow();

    expect(trackService.getAllByPlaylist).not.toHaveBeenCalled();
    expect(trackService.retry).not.toHaveBeenCalled();
  });

  it("propagates repository errors", async () => {
    const { playlistRepository, trackService } = makeDeps();
    vi.mocked(playlistRepository.findOne).mockRejectedValue(new Error("db error"));

    const useCase = makeUseCase(playlistRepository, trackService);

    await expect(useCase.execute("p1")).rejects.toThrow("db error");
  });

  it("propagates trackService.retry errors", async () => {
    const { playlistRepository, trackService } = makeDeps();
    vi.mocked(playlistRepository.findOne).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(trackService.getAllByPlaylist).mockResolvedValue([
      makeTrack({ id: "t1", status: TrackStatusEnum.Error }),
    ]);
    vi.mocked(trackService.retry).mockRejectedValue(new Error("retry failed"));

    const useCase = makeUseCase(playlistRepository, trackService);

    await expect(useCase.execute("p1")).rejects.toThrow("retry failed");
  });

  it("handles empty tracks array without calling retry", async () => {
    const { playlistRepository, trackService } = makeDeps();
    vi.mocked(playlistRepository.findOne).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(trackService.getAllByPlaylist).mockResolvedValue([]);

    const useCase = makeUseCase(playlistRepository, trackService);
    await useCase.execute("p1");

    expect(trackService.retry).not.toHaveBeenCalled();
  });
});
