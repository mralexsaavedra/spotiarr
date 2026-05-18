import { PlaylistTypeEnum } from "@spotiarr/shared";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Playlist } from "@/domain/entities/playlist.entity";
import { AppError } from "@/domain/errors/app-error";
import { CreatePlaylistUseCase } from "./create-playlist.use-case";

// Minimal in-memory stubs
function makePlaylistEntity() {
  return new Playlist({
    id: "playlist-id",
    spotifyUrl: "spotiarr://album/artist-1/album-1",
    type: PlaylistTypeEnum.Album,
    name: "Artist - Album",
  });
}

function makeStubs() {
  const savedEntity = makePlaylistEntity();

  const playlistRepository = {
    findAll: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(savedEntity),
    update: vi.fn(),
    findOne: vi.fn(),
    delete: vi.fn(),
    removeCompleted: vi.fn(),
  };

  const spotifyService = {
    getPlaylistDetail: vi.fn().mockResolvedValue({
      tracks: [],
      name: "Playlist",
      image: "",
      type: "playlist",
    }),
  };

  const trackService = {
    create: vi.fn().mockResolvedValue(undefined),
    getAllByPlaylist: vi.fn().mockResolvedValue([]),
  };

  const settingsService = {
    getBoolean: vi.fn().mockResolvedValue(false),
    getString: vi.fn().mockResolvedValue(""),
    getNumber: vi.fn().mockResolvedValue(0),
  };

  const eventBus = {
    emit: vi.fn(),
    on: vi.fn(),
  };

  const getAlbumTracksUseCase = {
    execute: vi.fn().mockResolvedValue([
      {
        name: "Track 1",
        artist: "Artist",
        artists: [{ name: "Artist", url: undefined }],
        album: "Album",
        trackNumber: 1,
        durationMs: 200000,
      },
    ]),
  };

  const feedRepository = {
    getArtistAlbumWithArtist: vi.fn().mockResolvedValue({
      albumName: "Album",
      artistName: "Artist",
      coverUrl: "http://cover.jpg",
    }),
    getArtistReleaseWithArtist: vi.fn().mockResolvedValue(null),
    upsertArtistAlbumSpotifyUrl: vi.fn(),
    updateArtistReleaseSpotifyUrl: vi.fn(),
  };

  return {
    playlistRepository,
    spotifyService,
    trackService,
    settingsService,
    eventBus,
    getAlbumTracksUseCase,
    feedRepository,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function makeUseCase(stubs: ReturnType<typeof makeStubs>) {
  return new CreatePlaylistUseCase(
    stubs.playlistRepository as any,
    stubs.spotifyService as any,
    stubs.trackService as any,
    stubs.settingsService as any,
    stubs.eventBus as any,
    stubs.getAlbumTracksUseCase as any,
    stubs.feedRepository as any,
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

describe("CreatePlaylistUseCase — albumTrack branch", () => {
  let stubs: ReturnType<typeof makeStubs>;

  beforeEach(() => {
    stubs = makeStubs();
    // Provide two tracks so index 1 is in range
    stubs.getAlbumTracksUseCase.execute.mockResolvedValue([
      {
        name: "Track 1",
        artist: "Artist",
        artists: [{ name: "Artist", url: undefined }],
        album: "Album",
        trackNumber: 1,
        durationMs: 200000,
      },
      {
        name: "Track 2",
        artist: "Artist",
        artists: [{ name: "Artist", url: undefined }],
        album: "Album",
        trackNumber: 2,
        durationMs: 220000,
      },
    ]);
  });

  it("creates a playlist for a single album track via albumTrack branch", async () => {
    const useCase = makeUseCase(stubs);

    const result = await useCase.execute({
      kind: "albumTrack",
      artistId: "artist-1",
      albumId: "album-1",
      trackIndex: 1,
    });

    expect(stubs.playlistRepository.findAll).toHaveBeenCalledWith(false, {
      spotifyUrl: "spotiarr://album/artist-1/album-1/track/1",
    });
    expect(stubs.getAlbumTracksUseCase.execute).toHaveBeenCalledWith("artist-1", "album-1");
    expect(stubs.playlistRepository.save).toHaveBeenCalled();
    expect(stubs.eventBus.emit).toHaveBeenCalledWith("playlists-updated");
    expect(result).toBeDefined();
  });

  it("throws 404 when trackIndex is out of range", async () => {
    const useCase = makeUseCase(stubs);

    const thrown = await useCase
      .execute({ kind: "albumTrack", artistId: "artist-1", albumId: "album-1", trackIndex: 99 })
      .catch((e) => e);

    expect(thrown).toBeInstanceOf(AppError);
    expect((thrown as AppError).statusCode).toBe(404);
    expect((thrown as AppError).errorCode).toBe("track_not_found");
  });

  it("dedupes albumTrack playlists by synthetic URL (throws 409 on repeat)", async () => {
    const existingEntity = makePlaylistEntity();
    stubs.playlistRepository.findAll.mockResolvedValue([existingEntity]);

    const useCase = makeUseCase(stubs);

    const thrown = await useCase
      .execute({ kind: "albumTrack", artistId: "artist-1", albumId: "album-1", trackIndex: 0 })
      .catch((e) => e);

    expect(thrown).toBeInstanceOf(AppError);
    expect((thrown as AppError).errorCode).toBe("playlist_already_exists");
  });
});

describe("CreatePlaylistUseCase — album branch", () => {
  let stubs: ReturnType<typeof makeStubs>;

  beforeEach(() => {
    stubs = makeStubs();
  });

  it("creates a playlist via synthetic URL for album branch", async () => {
    const useCase = makeUseCase(stubs);

    const result = await useCase.execute({
      kind: "album",
      artistId: "artist-1",
      albumId: "album-1",
    });

    expect(stubs.playlistRepository.findAll).toHaveBeenCalledWith(false, {
      spotifyUrl: "spotiarr://album/artist-1/album-1",
    });
    expect(stubs.getAlbumTracksUseCase.execute).toHaveBeenCalledWith("artist-1", "album-1");
    expect(stubs.playlistRepository.save).toHaveBeenCalled();
    expect(stubs.eventBus.emit).toHaveBeenCalledWith("playlists-updated");
    expect(result).toBeDefined();
  });

  it("throws 409 when album playlist already exists (dedup)", async () => {
    const existingEntity = makePlaylistEntity();
    stubs.playlistRepository.findAll.mockResolvedValue([existingEntity]);

    const useCase = makeUseCase(stubs);

    await expect(
      useCase.execute({ kind: "album", artistId: "artist-1", albumId: "album-1" }),
    ).rejects.toThrow(AppError);

    const thrown = await useCase
      .execute({ kind: "album", artistId: "artist-1", albumId: "album-1" })
      .catch((e) => e);
    expect(thrown).toBeInstanceOf(AppError);
    expect((thrown as AppError).errorCode).toBe("playlist_already_exists");
  });

  it("uses fallback metadata when feedRepository returns null", async () => {
    stubs.feedRepository.getArtistAlbumWithArtist.mockResolvedValue(null);

    const useCase = makeUseCase(stubs);
    const result = await useCase.execute({
      kind: "album",
      artistId: "artist-1",
      albumId: "album-1",
    });

    // Should still succeed with "Unknown Artist - Unknown Album" name
    expect(stubs.playlistRepository.save).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it("forwards spotifyUrl kind to the Spotify path", async () => {
    stubs.spotifyService.getPlaylistDetail.mockResolvedValue({
      tracks: [],
      name: "My Playlist",
      image: "",
      type: "playlist",
      owner: "user",
      ownerUrl: undefined,
    });

    const useCase = makeUseCase(stubs);
    await useCase.execute({
      kind: "spotifyUrl",
      spotifyUrl: "https://open.spotify.com/album/abc123",
    });

    expect(stubs.spotifyService.getPlaylistDetail).toHaveBeenCalledWith(
      "https://open.spotify.com/album/abc123",
    );
    expect(stubs.getAlbumTracksUseCase.execute).not.toHaveBeenCalled();
  });
});
