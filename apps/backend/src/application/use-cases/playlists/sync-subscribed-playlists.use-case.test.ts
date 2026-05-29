import { PlaylistTypeEnum, type ITrack } from "@spotiarr/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Playlist } from "@/domain/entities/playlist.entity";
import { SyncSubscribedPlaylistsUseCase } from "./sync-subscribed-playlists.use-case";

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
    );

    await useCase.execute();

    expect(trackService.create).not.toHaveBeenCalled();
  });
});
