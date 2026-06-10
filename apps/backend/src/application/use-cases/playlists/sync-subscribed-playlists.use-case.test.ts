import { PlaylistTypeEnum, TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Playlist } from "@/domain/entities/playlist.entity";
import { AppError } from "@/domain/errors/app-error";
import { SyncSubscribedPlaylistsUseCase } from "./sync-subscribed-playlists.use-case";

const spotifyCircuitBreaker = {
  isOpen: vi.fn(() => false),
};

const retryTrackDownloadUseCase = {
  execute: vi.fn(),
};

describe("SyncSubscribedPlaylistsUseCase", () => {
  const playlist = new Playlist({
    id: "playlist-1",
    spotifyUrl: "https://open.spotify.com/playlist/playlist-1",
    subscribed: true,
    type: PlaylistTypeEnum.Playlist,
    name: "Playlist",
  });

  const playlistRepository = {
    findAll: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
  };

  const spotifyService = {
    getPlaylistDetail: vi.fn(),
  };

  const trackService = {
    getAllByPlaylist: vi.fn(),
    create: vi.fn(),
  };

  const eventBus = {
    emit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    spotifyCircuitBreaker.isOpen.mockReturnValue(false);
    playlistRepository.findAll.mockResolvedValue([playlist]);
    playlistRepository.save.mockResolvedValue(undefined);
    playlistRepository.update.mockResolvedValue(undefined);
    spotifyService.getPlaylistDetail.mockResolvedValue({
      name: "Playlist",
      image: "",
      type: "playlist",
      owner: "user",
      ownerUrl: undefined,
      tracks: [
        {
          name: "Song",
          artist: "Artist",
          artists: [{ name: "Artist", url: "https://open.spotify.com/artist/artist-1" }],
          album: "Album",
          albumYear: 2026,
          trackUrl: "https://open.spotify.com/track/track-1",
          previewUrl: "https://p.scdn.co/mp3-preview/track-1",
          durationMs: 180000,
        },
      ],
    });
    trackService.create.mockResolvedValue(undefined);
  });

  it("dedupes using trackUrl instead of legacy spotifyUrl semantics", async () => {
    const existingTrack: ITrack = {
      name: "Song",
      artist: "Artist",
      trackUrl: "https://open.spotify.com/track/track-1",
    };
    trackService.getAllByPlaylist.mockResolvedValue([existingTrack]);

    const useCase = new SyncSubscribedPlaylistsUseCase(
      playlistRepository as never,
      spotifyService as never,
      trackService as never,
      eventBus as never,
      spotifyCircuitBreaker as never,
      retryTrackDownloadUseCase as never,
    );

    await useCase.execute();

    expect(trackService.create).not.toHaveBeenCalled();
  });

  it("re-enqueues previously errored tracks on subscribed playlists", async () => {
    const erroredTrack: ITrack = {
      id: "track-err",
      name: "Song",
      artist: "Artist",
      trackUrl: "https://open.spotify.com/track/track-1",
      status: TrackStatusEnum.Error,
    };
    trackService.getAllByPlaylist.mockResolvedValue([erroredTrack]);

    const useCase = new SyncSubscribedPlaylistsUseCase(
      playlistRepository as never,
      spotifyService as never,
      trackService as never,
      eventBus as never,
      spotifyCircuitBreaker as never,
      retryTrackDownloadUseCase as never,
    );

    await useCase.execute();

    // Spotify returns the same single track, so nothing new is created, but the
    // stranded errored track must be retried so the subscription can complete.
    expect(trackService.create).not.toHaveBeenCalled();
    expect(retryTrackDownloadUseCase.execute).toHaveBeenCalledWith("track-err");
  });

  it("does not re-enqueue completed tracks", async () => {
    const completedTrack: ITrack = {
      id: "track-ok",
      name: "Song",
      artist: "Artist",
      trackUrl: "https://open.spotify.com/track/track-1",
      status: TrackStatusEnum.Completed,
    };
    trackService.getAllByPlaylist.mockResolvedValue([completedTrack]);

    const useCase = new SyncSubscribedPlaylistsUseCase(
      playlistRepository as never,
      spotifyService as never,
      trackService as never,
      eventBus as never,
      spotifyCircuitBreaker as never,
      retryTrackDownloadUseCase as never,
    );

    await useCase.execute();

    expect(retryTrackDownloadUseCase.execute).not.toHaveBeenCalled();
  });

  it("skips the run entirely when the Spotify circuit breaker is open", async () => {
    spotifyCircuitBreaker.isOpen.mockReturnValue(true);

    const useCase = new SyncSubscribedPlaylistsUseCase(
      playlistRepository as never,
      spotifyService as never,
      trackService as never,
      eventBus as never,
      spotifyCircuitBreaker as never,
      retryTrackDownloadUseCase as never,
    );

    await useCase.execute();

    expect(playlistRepository.findAll).not.toHaveBeenCalled();
    expect(spotifyService.getPlaylistDetail).not.toHaveBeenCalled();
  });

  it("unsubscribes 3rd-party playlists permanently on playlist_not_accessible", async () => {
    const thirdParty = new Playlist({
      id: "other-user-playlist",
      spotifyUrl: "https://open.spotify.com/playlist/other-user-playlist",
      subscribed: true,
      type: PlaylistTypeEnum.Playlist,
      name: "Foreign",
    });
    playlistRepository.findAll.mockResolvedValue([thirdParty]);
    spotifyService.getPlaylistDetail.mockRejectedValue(
      new AppError(403, "playlist_not_accessible", "belongs to another user"),
    );

    const useCase = new SyncSubscribedPlaylistsUseCase(
      playlistRepository as never,
      spotifyService as never,
      trackService as never,
      eventBus as never,
      spotifyCircuitBreaker as never,
      retryTrackDownloadUseCase as never,
    );

    await useCase.execute();

    expect(thirdParty.subscribed).toBe(false);
    expect(thirdParty.error).toBe("belongs to another user");
    expect(playlistRepository.update).toHaveBeenCalledWith(thirdParty.id, thirdParty);
  });

  it("aborts the loop on circuit_open instead of marking every playlist as errored", async () => {
    const second = new Playlist({
      id: "playlist-2",
      spotifyUrl: "https://open.spotify.com/playlist/playlist-2",
      subscribed: true,
      type: PlaylistTypeEnum.Playlist,
      name: "Second",
    });
    playlistRepository.findAll.mockResolvedValue([playlist, second]);
    spotifyService.getPlaylistDetail.mockRejectedValue(
      new AppError(503, "circuit_open", "Spotify rate limit circuit breaker is open"),
    );

    const useCase = new SyncSubscribedPlaylistsUseCase(
      playlistRepository as never,
      spotifyService as never,
      trackService as never,
      eventBus as never,
      spotifyCircuitBreaker as never,
      retryTrackDownloadUseCase as never,
    );

    await useCase.execute();

    expect(spotifyService.getPlaylistDetail).toHaveBeenCalledTimes(1);
    expect(playlistRepository.update).not.toHaveBeenCalled();
  });
});
