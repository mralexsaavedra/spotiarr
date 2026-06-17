import { PlaylistTypeEnum } from "@spotiarr/shared";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SettingsPort } from "@/application/ports/settings.port";
import { Playlist } from "@/domain/entities/playlist.entity";
import { AppError } from "@/domain/errors/app-error";
import { CreatePlaylistUseCase } from "./create-playlist.use-case";

// Minimal in-memory stubs
function makePlaylistEntity(
  overrides: Partial<{ id: string; spotifyUrl: string; type: PlaylistTypeEnum; name: string }> = {},
) {
  return new Playlist({
    id: overrides.id ?? "playlist-id",
    spotifyUrl: overrides.spotifyUrl ?? "spotiarr://album/artist-1/album-1",
    type: overrides.type ?? PlaylistTypeEnum.Album,
    name: overrides.name ?? "Artist - Album",
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
  };

  const spotifyService = {
    getPlaylistDetail: vi.fn().mockResolvedValue({
      tracks: [],
      name: "Playlist",
      image: "",
      type: "playlist",
    }),
    getPlaylistMetadata: vi.fn().mockResolvedValue({
      name: "Parent Playlist",
      image: "https://image.test/cover.jpg",
      owner: "user1",
      ownerUrl: "https://open.spotify.com/user/user1",
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
        primaryArtistImage: "http://track-artist.jpg",
        artists: [{ name: "Artist", url: undefined }],
        album: "Album",
        trackNumber: 1,
        durationMs: 200000,
      },
    ]),
  };

  const feedRepository = {
    getArtistByAnyId: vi.fn().mockResolvedValue({
      id: "artist-1",
      name: "Artist",
      image: "http://artist.jpg",
      spotifyUrl: "https://open.spotify.com/artist/artist1",
    }),
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
        primaryArtistImage: "http://track-artist.jpg",
        artists: [{ name: "Artist", url: undefined }],
        album: "Album",
        trackNumber: 1,
        durationMs: 200000,
      },
      {
        name: "Track 2",
        artist: "Artist",
        primaryArtistImage: "http://track-artist.jpg",
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
    expect(stubs.spotifyService.getPlaylistDetail).not.toHaveBeenCalled();
    expect(stubs.playlistRepository.save).toHaveBeenCalled();
    expect(stubs.eventBus.emit).toHaveBeenCalledWith("playlists-updated");
    expect(result).toBeDefined();
  });

  it("uses release cache metadata for albumTrack playlists", async () => {
    stubs.feedRepository.getArtistAlbumWithArtist.mockResolvedValue(null);
    stubs.feedRepository.getArtistReleaseWithArtist.mockResolvedValue({
      albumName: "Release Album",
      artistName: "Release Artist",
      coverUrl: "http://release-cover.jpg",
    });

    const useCase = makeUseCase(stubs);

    await useCase.execute({
      kind: "albumTrack",
      artistId: "artist-1",
      albumId: "deezer-1",
      trackIndex: 1,
    });

    const savedPlaylist = stubs.playlistRepository.save.mock.calls[0]?.[0] as Playlist;

    expect(savedPlaylist.toPrimitive()).toMatchObject({
      name: "Release Artist - Track 2",
      coverUrl: "http://release-cover.jpg",
      artistImageUrl: "http://artist.jpg",
      owner: "Release Artist",
    });
  });

  it("falls back to track artist image when cached artist image is unavailable", async () => {
    stubs.feedRepository.getArtistByAnyId.mockResolvedValue({
      id: "artist-1",
      name: "Artist",
      image: null,
      spotifyUrl: "https://open.spotify.com/artist/artist1",
    });

    const useCase = makeUseCase(stubs);

    await useCase.execute({
      kind: "albumTrack",
      artistId: "artist-1",
      albumId: "album-1",
      trackIndex: 1,
    });

    const savedPlaylist = stubs.playlistRepository.save.mock.calls[0]?.[0] as Playlist;

    expect(savedPlaylist.toPrimitive().artistImageUrl).toBe("http://track-artist.jpg");
  });

  it("derives metadata from tracks when both album and release caches miss (Deezer-origin album)", async () => {
    stubs.feedRepository.getArtistAlbumWithArtist.mockResolvedValue(null);
    stubs.feedRepository.getArtistReleaseWithArtist.mockResolvedValue(null);
    stubs.feedRepository.getArtistByAnyId.mockResolvedValue(null);
    stubs.getAlbumTracksUseCase.execute.mockResolvedValue([
      {
        name: "Track 1",
        artist: "Deezer Artist",
        primaryArtist: "Deezer Artist",
        primaryArtistImage: "http://deezer-artist.jpg",
        artists: [{ name: "Deezer Artist", url: undefined }],
        album: "Deezer Album",
        albumCoverUrl: "http://deezer-cover.jpg",
        trackNumber: 1,
        durationMs: 200000,
      },
      {
        name: "Track 2",
        artist: "Deezer Artist",
        primaryArtist: "Deezer Artist",
        primaryArtistImage: "http://deezer-artist.jpg",
        artists: [{ name: "Deezer Artist", url: undefined }],
        album: "Deezer Album",
        albumCoverUrl: "http://deezer-cover.jpg",
        trackNumber: 2,
        durationMs: 220000,
      },
    ]);

    const useCase = makeUseCase(stubs);

    await useCase.execute({
      kind: "albumTrack",
      artistId: "deezer-artist-1",
      albumId: "deezer-album-1",
      trackIndex: 1,
    });

    const savedPlaylist = stubs.playlistRepository.save.mock.calls[0]?.[0] as Playlist;

    expect(savedPlaylist.toPrimitive()).toMatchObject({
      name: "Deezer Artist - Track 2",
      coverUrl: "http://deezer-cover.jpg",
      artistImageUrl: "http://deezer-artist.jpg",
      owner: "Deezer Artist",
    });
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

describe("CreatePlaylistUseCase — deezerTrack branch (DTD-2)", () => {
  let stubs: ReturnType<typeof makeStubs>;

  beforeEach(() => {
    stubs = makeStubs();
  });

  function makeDeezerUseCase(
    deezerClient: { getAlbumTracks: ReturnType<typeof vi.fn> },
    s: ReturnType<typeof makeStubs> = stubs,
  ) {
    return new CreatePlaylistUseCase(
      s.playlistRepository as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      s.spotifyService as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      s.trackService as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      s.settingsService as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      s.eventBus as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      s.getAlbumTracksUseCase as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      s.feedRepository as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      deezerClient as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    );
  }

  it("DTD-2a: deezerTrack kind — found in album → creates single-track playlist", async () => {
    const deezerClient = {
      getAlbumTracks: vi.fn().mockResolvedValue([
        {
          name: "Karma Police",
          artist: "Radiohead",
          artists: [{ name: "Radiohead", url: undefined }],
          album: "OK Computer",
          trackNumber: 3,
          durationMs: 263000,
          trackUrl: "https://api.deezer.com/track/12345",
          albumUrl: "https://api.deezer.com/album/456",
          albumCoverUrl: "https://cdn.deezer.com/cover.jpg",
        },
        {
          name: "No Surprises",
          artist: "Radiohead",
          artists: [{ name: "Radiohead", url: undefined }],
          album: "OK Computer",
          trackNumber: 12,
          durationMs: 228000,
          trackUrl: "https://api.deezer.com/track/99999",
          albumUrl: "https://api.deezer.com/album/456",
          albumCoverUrl: "https://cdn.deezer.com/cover.jpg",
        },
      ]),
    };

    const useCase = makeDeezerUseCase(deezerClient);

    const result = await useCase.execute({
      kind: "deezerTrack",
      deezerTrackId: "12345",
      deezerAlbumId: "456",
    });

    expect(deezerClient.getAlbumTracks).toHaveBeenCalledWith("456");
    expect(stubs.trackService.create).toHaveBeenCalledTimes(1);
    expect(stubs.trackService.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Karma Police" }),
    );
    expect(stubs.eventBus.emit).toHaveBeenCalledWith("playlists-updated");
    expect(result).toBeDefined();
  });

  it("DTD-2b: deezerTrack kind — track NOT in album → throws 404", async () => {
    const deezerClient = {
      getAlbumTracks: vi.fn().mockResolvedValue([
        {
          name: "No Surprises",
          artist: "Radiohead",
          artists: [{ name: "Radiohead", url: undefined }],
          album: "OK Computer",
          trackNumber: 12,
          durationMs: 228000,
          trackUrl: "https://api.deezer.com/track/99999",
          albumUrl: "https://api.deezer.com/album/456",
          albumCoverUrl: "https://cdn.deezer.com/cover.jpg",
        },
      ]),
    };

    const useCase = makeDeezerUseCase(deezerClient);

    const thrown = await useCase
      .execute({
        kind: "deezerTrack",
        deezerTrackId: "99998",
        deezerAlbumId: "456",
      })
      .catch((e) => e);

    expect(thrown).toBeInstanceOf(AppError);
    expect((thrown as AppError).statusCode).toBe(404);
    expect((thrown as AppError).errorCode).toBe("track_not_found");
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
    expect(stubs.spotifyService.getPlaylistDetail).not.toHaveBeenCalled();
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

  it("uses release cache metadata when album cache is missing", async () => {
    stubs.feedRepository.getArtistAlbumWithArtist.mockResolvedValue(null);
    stubs.feedRepository.getArtistReleaseWithArtist.mockResolvedValue({
      albumName: "Release Album",
      artistName: "Release Artist",
      coverUrl: "http://release-cover.jpg",
    });

    const useCase = makeUseCase(stubs);

    await useCase.execute({
      kind: "album",
      artistId: "artist-1",
      albumId: "deezer-1",
    });

    const savedPlaylist = stubs.playlistRepository.save.mock.calls[0]?.[0] as Playlist;

    expect(savedPlaylist.toPrimitive()).toMatchObject({
      name: "Release Artist - Release Album",
      coverUrl: "http://release-cover.jpg",
      artistImageUrl: "http://artist.jpg",
      owner: "Release Artist",
    });
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

  it("persists trackUrl without overloading spotifyUrl with previewUrl", async () => {
    stubs.spotifyService.getPlaylistDetail.mockResolvedValue({
      tracks: [
        {
          name: "Song",
          artist: "Artist",
          artists: [{ name: "Artist", url: "https://open.spotify.com/artist/artist-1" }],
          album: "Album",
          albumUrl: "https://open.spotify.com/album/album-1",
          albumYear: 2026,
          trackUrl: "https://open.spotify.com/track/track-1",
          previewUrl: "https://p.scdn.co/mp3-preview/track-1",
          durationMs: 180000,
        },
      ],
      name: "My Playlist",
      image: "",
      type: "playlist",
      owner: "user",
      ownerUrl: undefined,
    });

    const useCase = makeUseCase(stubs);
    await useCase.execute({
      kind: "spotifyUrl",
      spotifyUrl: "https://open.spotify.com/playlist/abc123",
    });

    const createdTrack = stubs.trackService.create.mock.calls[0]?.[0];

    expect(createdTrack).toMatchObject({
      trackUrl: "https://open.spotify.com/track/track-1",
      albumUrl: "https://open.spotify.com/album/album-1",
    });
    expect(createdTrack).not.toHaveProperty("spotifyUrl");
  });
});

describe("CreatePlaylistUseCase — executePlaylistTrack branch", () => {
  const PARENT_URL = "https://open.spotify.com/playlist/parent-id";
  const TRACK_URL = "https://open.spotify.com/track/track-id";

  let stubs: ReturnType<typeof makeStubs>;

  beforeEach(() => {
    stubs = makeStubs();

    // Default: no existing parent found
    stubs.playlistRepository.findAll.mockResolvedValue([]);

    // Default: getPlaylistMetadata returns playlist metadata
    stubs.spotifyService.getPlaylistMetadata.mockResolvedValue({
      name: "Parent Playlist",
      image: "https://image.test/cover.jpg",
      owner: "user1",
      ownerUrl: "https://open.spotify.com/user/user1",
    });

    // Default: getPlaylistDetail for track returns one track
    stubs.spotifyService.getPlaylistDetail.mockResolvedValue({
      tracks: [
        {
          name: "My Track",
          artist: "Artist",
          artists: [{ name: "Artist", url: "https://open.spotify.com/artist/art1" }],
          album: "My Album",
          trackUrl: TRACK_URL,
          durationMs: 200000,
        },
      ],
      name: "My Track",
      image: "https://image.test/track.jpg",
      type: "track",
    });

    // Default: savedEntity is a proper playlist entity
    const parentEntity = makePlaylistEntity({
      id: "parent-entity-id",
      spotifyUrl: PARENT_URL,
      type: PlaylistTypeEnum.Playlist,
      name: "Parent Playlist",
    });
    stubs.playlistRepository.save.mockResolvedValue(parentEntity);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("PT-1: creates parent on findAll cache miss — calls getPlaylistMetadata and saves with type=Playlist", async () => {
    const useCase = makeUseCase(stubs);

    await useCase.execute({
      kind: "playlistTrack",
      parentSpotifyUrl: PARENT_URL,
      trackUrl: TRACK_URL,
    });

    expect(stubs.playlistRepository.findAll).toHaveBeenCalledWith(false, {
      spotifyUrl: PARENT_URL,
    });
    expect(stubs.spotifyService.getPlaylistMetadata).toHaveBeenCalledWith(PARENT_URL);
    expect(stubs.playlistRepository.save).toHaveBeenCalled();

    const savedArg = stubs.playlistRepository.save.mock.calls[0]?.[0] as Playlist;
    expect(savedArg.toPrimitive()).toMatchObject({
      spotifyUrl: PARENT_URL,
      type: PlaylistTypeEnum.Playlist,
      name: "Parent Playlist",
      coverUrl: "https://image.test/cover.jpg",
      owner: "user1",
      ownerUrl: "https://open.spotify.com/user/user1",
    });
  });

  it("PT-2: reuses existing parent on cache hit — skips getPlaylistMetadata and save", async () => {
    const existingParent = makePlaylistEntity({
      id: "existing-parent-id",
      spotifyUrl: PARENT_URL,
      type: PlaylistTypeEnum.Playlist,
      name: "Existing Parent",
    });
    stubs.playlistRepository.findAll.mockResolvedValue([existingParent]);

    const useCase = makeUseCase(stubs);

    await useCase.execute({
      kind: "playlistTrack",
      parentSpotifyUrl: PARENT_URL,
      trackUrl: TRACK_URL,
    });

    expect(stubs.spotifyService.getPlaylistMetadata).not.toHaveBeenCalled();
    expect(stubs.playlistRepository.save).not.toHaveBeenCalled();
  });

  it("PT-3: links the track to the parent via processTracks with correct playlistId", async () => {
    const useCase = makeUseCase(stubs);

    await useCase.execute({
      kind: "playlistTrack",
      parentSpotifyUrl: PARENT_URL,
      trackUrl: TRACK_URL,
    });

    expect(stubs.trackService.create).toHaveBeenCalledOnce();
    expect(stubs.trackService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        playlistId: "parent-entity-id",
        name: "My Track",
      }),
    );
  });

  it("PT-4: P2002 race recovery — returns winner parent when save throws P2002 and re-read finds it", async () => {
    const p2002Err = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    const winnerParent = makePlaylistEntity({
      id: "winner-parent-id",
      spotifyUrl: PARENT_URL,
      type: PlaylistTypeEnum.Playlist,
      name: "Winner Parent",
    });

    // First call: no existing parent
    // After P2002: re-read returns winner
    stubs.playlistRepository.findAll
      .mockResolvedValueOnce([]) // initial find
      .mockResolvedValueOnce([winnerParent]); // re-read after P2002

    stubs.playlistRepository.save.mockRejectedValueOnce(p2002Err);

    const useCase = makeUseCase(stubs);

    const result = await useCase.execute({
      kind: "playlistTrack",
      parentSpotifyUrl: PARENT_URL,
      trackUrl: TRACK_URL,
    });

    expect(result).toMatchObject({ id: "winner-parent-id" });
    // Should not throw
  });

  it("PT-5: P2002 with no row on re-read — re-throws the original error", async () => {
    const p2002Err = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });

    stubs.playlistRepository.findAll
      .mockResolvedValueOnce([]) // initial find
      .mockResolvedValueOnce([]); // re-read after P2002 — still empty

    stubs.playlistRepository.save.mockRejectedValueOnce(p2002Err);

    const useCase = makeUseCase(stubs);

    const thrown = await useCase
      .execute({
        kind: "playlistTrack",
        parentSpotifyUrl: PARENT_URL,
        trackUrl: TRACK_URL,
      })
      .catch((e) => e);

    expect(thrown).toBe(p2002Err);
  });

  it("PT-6: track not found — throws track_not_found when getPlaylistDetail returns empty tracks", async () => {
    stubs.spotifyService.getPlaylistDetail.mockResolvedValue({
      tracks: [],
      name: "",
      image: "",
      type: "track",
    });

    const useCase = makeUseCase(stubs);

    const thrown = await useCase
      .execute({
        kind: "playlistTrack",
        parentSpotifyUrl: PARENT_URL,
        trackUrl: TRACK_URL,
      })
      .catch((e) => e);

    expect(thrown).toBeInstanceOf(AppError);
    expect((thrown as AppError).errorCode).toBe("track_not_found");
  });

  it("PT-7: auto-subscribe respected — new parent is marked subscribed when AUTO_SUBSCRIBE_NEW_PLAYLISTS=true", async () => {
    stubs.settingsService.getBoolean.mockResolvedValue(true);

    const useCase = makeUseCase(stubs);

    await useCase.execute({
      kind: "playlistTrack",
      parentSpotifyUrl: PARENT_URL,
      trackUrl: TRACK_URL,
    });

    const savedArg = stubs.playlistRepository.save.mock.calls[0]?.[0] as Playlist;
    expect(savedArg.toPrimitive().subscribed).toBe(true);
  });
});

describe("CreatePlaylistUseCase — SettingsPort seam", () => {
  it("is constructable with a FakeSettingsPort and auto-subscribes when getBoolean returns true", async () => {
    const store = new Map<string, boolean>([["AUTO_SUBSCRIBE_NEW_PLAYLISTS", true]]);
    const fakeSettings: SettingsPort = {
      getString: async () => "",
      getNumber: async () => 0,
      getBoolean: async (key) => store.get(key) ?? false,
    };

    const savedEntity = new Playlist({
      id: "pl-1",
      spotifyUrl: "spotiarr://album/artist-1/album-1",
      type: PlaylistTypeEnum.Album,
    });

    const playlistRepository = {
      findAll: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(savedEntity),
    };
    const spotifyService = { getPlaylistDetail: vi.fn(), getPlaylistMetadata: vi.fn() };
    const trackService = { create: vi.fn(), getAllByPlaylist: vi.fn() };
    const eventBus = { emit: vi.fn(), on: vi.fn() };
    const getAlbumTracksUseCase = {
      execute: vi
        .fn()
        .mockResolvedValue([{ name: "T1", artist: "A", trackNumber: 1, durationMs: 1000 }]),
    };
    const feedRepository = {
      getArtistByAnyId: vi.fn().mockResolvedValue(null),
      getArtistAlbumWithArtist: vi.fn().mockResolvedValue({
        albumName: "Album",
        artistName: "Artist",
        coverUrl: undefined,
      }),
      getArtistReleaseWithArtist: vi.fn().mockResolvedValue(null),
    };

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const useCase = new CreatePlaylistUseCase(
      playlistRepository as any,
      spotifyService as any,
      trackService as any,
      fakeSettings,
      eventBus as any,
      getAlbumTracksUseCase as any,
      feedRepository as any,
    );
    /* eslint-enable @typescript-eslint/no-explicit-any */

    await useCase.execute({ kind: "album", artistId: "artist-1", albumId: "album-1" });

    const savedArg = playlistRepository.save.mock.calls[0]?.[0] as Playlist;
    expect(savedArg.toPrimitive().subscribed).toBe(true);
  });
});

describe("CreatePlaylistUseCase — executeSpotifyUrl branch", () => {
  let stubs: ReturnType<typeof makeStubs>;

  beforeEach(() => {
    stubs = makeStubs();
  });

  it("saves playlist and processes tracks on happy path", async () => {
    stubs.spotifyService.getPlaylistDetail.mockResolvedValue({
      tracks: [
        {
          name: "My Song",
          artist: "Band",
          primaryArtist: "Band",
          artists: [{ name: "Band", url: undefined }],
          album: "My Album",
          trackNumber: 1,
          durationMs: 200000,
          trackUrl: "https://open.spotify.com/track/abc",
        },
      ],
      name: "My Album",
      image: "img.jpg",
      type: "album",
      owner: "user",
      ownerUrl: "http://u",
    });

    const useCase = makeUseCase(stubs);
    await useCase.execute({
      kind: "spotifyUrl",
      spotifyUrl: "https://open.spotify.com/album/abc123",
    });

    expect(stubs.playlistRepository.save).toHaveBeenCalled();
    expect(stubs.trackService.create).toHaveBeenCalledTimes(1);
    expect(stubs.eventBus.emit).toHaveBeenCalledWith("playlists-updated");
  });

  it("displayName for album type: prepends primaryArtist to name", async () => {
    stubs.spotifyService.getPlaylistDetail.mockResolvedValue({
      tracks: [
        {
          name: "OK Computer",
          artist: "Radiohead",
          primaryArtist: "Radiohead",
          artists: [{ name: "Radiohead", url: undefined }],
          album: "OK Computer",
          trackNumber: 1,
          durationMs: 200000,
          trackUrl: "https://open.spotify.com/track/t1",
        },
      ],
      name: "OK Computer",
      image: "",
      type: "album",
      owner: "user",
      ownerUrl: undefined,
    });

    const useCase = makeUseCase(stubs);
    await useCase.execute({ kind: "spotifyUrl", spotifyUrl: "https://open.spotify.com/album/abc" });

    const savedPlaylist = stubs.playlistRepository.save.mock.calls[0]?.[0] as Playlist;
    expect(savedPlaylist.toPrimitive().name).toBe("Radiohead - OK Computer");
  });

  it("displayName for track type: prepends artist to name", async () => {
    stubs.spotifyService.getPlaylistDetail.mockResolvedValue({
      tracks: [
        {
          name: "Karma Police",
          artist: "Radiohead",
          primaryArtist: "Radiohead",
          artists: [{ name: "Radiohead", url: undefined }],
          album: "OK Computer",
          trackNumber: 3,
          durationMs: 200000,
          trackUrl: "https://open.spotify.com/track/t1",
        },
      ],
      name: "Karma Police",
      image: "",
      type: "track",
      owner: "user",
      ownerUrl: undefined,
    });

    const useCase = makeUseCase(stubs);
    await useCase.execute({ kind: "spotifyUrl", spotifyUrl: "https://open.spotify.com/track/abc" });

    const savedPlaylist = stubs.playlistRepository.save.mock.calls[0]?.[0] as Playlist;
    expect(savedPlaylist.toPrimitive().name).toBe("Radiohead - Karma Police");
  });

  it("displayName for artist type: uses plain name", async () => {
    stubs.spotifyService.getPlaylistDetail.mockResolvedValue({
      tracks: [],
      name: "Radiohead",
      image: "http://artist-image.jpg",
      type: "artist",
      owner: "user",
      ownerUrl: undefined,
    });

    const useCase = makeUseCase(stubs);
    await useCase.execute({
      kind: "spotifyUrl",
      spotifyUrl: "https://open.spotify.com/artist/abc",
    });

    const savedPlaylist = stubs.playlistRepository.save.mock.calls[0]?.[0] as Playlist;
    expect(savedPlaylist.toPrimitive().name).toBe("Radiohead");
  });

  it("artistImageUrl from artist type uses image field", async () => {
    stubs.spotifyService.getPlaylistDetail.mockResolvedValue({
      tracks: [],
      name: "Radiohead",
      image: "http://artist-image.jpg",
      type: "artist",
      owner: "user",
      ownerUrl: undefined,
    });

    const useCase = makeUseCase(stubs);
    await useCase.execute({
      kind: "spotifyUrl",
      spotifyUrl: "https://open.spotify.com/artist/abc",
    });

    const savedPlaylist = stubs.playlistRepository.save.mock.calls[0]?.[0] as Playlist;
    expect(savedPlaylist.toPrimitive().artistImageUrl).toBe("http://artist-image.jpg");
  });

  it("artistImageUrl from non-artist type uses first track primaryArtistImage", async () => {
    stubs.spotifyService.getPlaylistDetail.mockResolvedValue({
      tracks: [
        {
          name: "Track 1",
          artist: "Artist",
          primaryArtistImage: "http://track-artist.jpg",
          artists: [{ name: "Artist", url: undefined }],
          album: "Album",
          trackNumber: 1,
          durationMs: 200000,
          trackUrl: "https://open.spotify.com/track/t1",
        },
      ],
      name: "My Playlist",
      image: "http://playlist-cover.jpg",
      type: "playlist",
      owner: "user",
      ownerUrl: undefined,
    });

    const useCase = makeUseCase(stubs);
    await useCase.execute({
      kind: "spotifyUrl",
      spotifyUrl: "https://open.spotify.com/playlist/abc",
    });

    const savedPlaylist = stubs.playlistRepository.save.mock.calls[0]?.[0] as Playlist;
    expect(savedPlaylist.toPrimitive().artistImageUrl).toBe("http://track-artist.jpg");
  });

  it("autoSubscribe: marks playlist subscribed when setting is true", async () => {
    stubs.settingsService.getBoolean.mockResolvedValue(true);
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
      spotifyUrl: "https://open.spotify.com/playlist/abc",
    });

    const savedPlaylist = stubs.playlistRepository.save.mock.calls[0]?.[0] as Playlist;
    expect(savedPlaylist.toPrimitive().subscribed).toBe(true);
  });

  it("error in getPlaylistDetail: still saves and emits, does not process tracks", async () => {
    stubs.spotifyService.getPlaylistDetail.mockRejectedValue(new Error("Spotify down"));

    const useCase = makeUseCase(stubs);
    await useCase.execute({ kind: "spotifyUrl", spotifyUrl: "https://open.spotify.com/album/abc" });

    expect(stubs.playlistRepository.save).toHaveBeenCalled();
    expect(stubs.eventBus.emit).toHaveBeenCalledWith("playlists-updated");
    expect(stubs.trackService.create).not.toHaveBeenCalled();
  });

  it("no tracks in detail: save happens but trackService.create is not called", async () => {
    stubs.spotifyService.getPlaylistDetail.mockResolvedValue({
      tracks: [],
      name: "Empty Playlist",
      image: "",
      type: "playlist",
      owner: "user",
      ownerUrl: undefined,
    });

    const useCase = makeUseCase(stubs);
    await useCase.execute({
      kind: "spotifyUrl",
      spotifyUrl: "https://open.spotify.com/playlist/abc",
    });

    expect(stubs.playlistRepository.save).toHaveBeenCalled();
    expect(stubs.trackService.create).not.toHaveBeenCalled();
    expect(stubs.eventBus.emit).toHaveBeenCalledWith("playlists-updated");
  });

  it("duplicate spotifyUrl throws 409 with playlist_already_exists", async () => {
    const existingEntity = makePlaylistEntity({ spotifyUrl: "https://open.spotify.com/album/abc" });
    stubs.playlistRepository.findAll.mockResolvedValue([existingEntity]);

    const useCase = makeUseCase(stubs);
    const thrown = await useCase
      .execute({ kind: "spotifyUrl", spotifyUrl: "https://open.spotify.com/album/abc" })
      .catch((e) => e);

    expect(thrown).toBeInstanceOf(AppError);
    expect((thrown as AppError).errorCode).toBe("playlist_already_exists");
  });
});

describe("CreatePlaylistUseCase — missing optional deps (500 guards)", () => {
  let stubs: ReturnType<typeof makeStubs>;

  beforeEach(() => {
    stubs = makeStubs();
  });

  it("executeAlbumRef throws 500 when getAlbumTracksUseCase not provided", async () => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const useCase = new CreatePlaylistUseCase(
      stubs.playlistRepository as any,
      stubs.spotifyService as any,
      stubs.trackService as any,
      stubs.settingsService as any,
      stubs.eventBus as any,
      undefined, // no getAlbumTracksUseCase
      undefined, // no feedRepository
    );
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const thrown = await useCase
      .execute({ kind: "album", artistId: "artist-1", albumId: "album-1" })
      .catch((e) => e);

    expect(thrown).toBeInstanceOf(AppError);
    expect((thrown as AppError).statusCode).toBe(500);
  });

  it("executeAlbumTrackRef throws 500 when deps not configured", async () => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const useCase = new CreatePlaylistUseCase(
      stubs.playlistRepository as any,
      stubs.spotifyService as any,
      stubs.trackService as any,
      stubs.settingsService as any,
      stubs.eventBus as any,
      undefined,
      undefined,
    );
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const thrown = await useCase
      .execute({ kind: "albumTrack", artistId: "artist-1", albumId: "album-1", trackIndex: 0 })
      .catch((e) => e);

    expect(thrown).toBeInstanceOf(AppError);
    expect((thrown as AppError).statusCode).toBe(500);
  });

  it("executeDeezerTrack throws 500 when deezerClient not provided", async () => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const useCase = new CreatePlaylistUseCase(
      stubs.playlistRepository as any,
      stubs.spotifyService as any,
      stubs.trackService as any,
      stubs.settingsService as any,
      stubs.eventBus as any,
      stubs.getAlbumTracksUseCase as any,
      stubs.feedRepository as any,
      undefined, // no deezerClient
    );
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const thrown = await useCase
      .execute({ kind: "deezerTrack", deezerTrackId: "123", deezerAlbumId: "456" })
      .catch((e) => e);

    expect(thrown).toBeInstanceOf(AppError);
    expect((thrown as AppError).statusCode).toBe(500);
  });
});

describe("CreatePlaylistUseCase — executePlaylistTrack non-P2002 error", () => {
  it("non-P2002 error on parent save re-throws without swallowing", async () => {
    const stubs = makeStubs();
    const PARENT_URL = "https://open.spotify.com/playlist/parent-id";
    const TRACK_URL = "https://open.spotify.com/track/track-id";

    stubs.playlistRepository.findAll.mockResolvedValue([]);
    stubs.spotifyService.getPlaylistMetadata.mockResolvedValue({
      name: "Parent Playlist",
      image: "",
      owner: "user1",
      ownerUrl: undefined,
    });
    // Non-P2002 error (no .code property)
    stubs.playlistRepository.save.mockRejectedValue(new Error("DB down"));

    const useCase = makeUseCase(stubs);
    const thrown = await useCase
      .execute({ kind: "playlistTrack", parentSpotifyUrl: PARENT_URL, trackUrl: TRACK_URL })
      .catch((e) => e);

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe("DB down");
  });
});

describe("CreatePlaylistUseCase — processTrack edge cases", () => {
  let stubs: ReturnType<typeof makeStubs>;

  beforeEach(() => {
    stubs = makeStubs();
  });

  it("skips track when artist is missing", async () => {
    stubs.spotifyService.getPlaylistDetail.mockResolvedValue({
      tracks: [
        {
          name: "Track Without Artist",
          artist: "",
          artists: [],
          album: "Album",
          trackNumber: 1,
          durationMs: 200000,
          trackUrl: "https://open.spotify.com/track/t1",
        },
      ],
      name: "My Playlist",
      image: "",
      type: "playlist",
      owner: "user",
      ownerUrl: undefined,
    });

    const useCase = makeUseCase(stubs);
    await useCase.execute({
      kind: "spotifyUrl",
      spotifyUrl: "https://open.spotify.com/playlist/abc",
    });

    expect(stubs.trackService.create).not.toHaveBeenCalled();
  });

  it("skips track when name is missing", async () => {
    stubs.spotifyService.getPlaylistDetail.mockResolvedValue({
      tracks: [
        {
          name: "",
          artist: "Artist",
          artists: [{ name: "Artist", url: undefined }],
          album: "Album",
          trackNumber: 1,
          durationMs: 200000,
          trackUrl: "https://open.spotify.com/track/t1",
        },
      ],
      name: "My Playlist",
      image: "",
      type: "playlist",
      owner: "user",
      ownerUrl: undefined,
    });

    const useCase = makeUseCase(stubs);
    await useCase.execute({
      kind: "spotifyUrl",
      spotifyUrl: "https://open.spotify.com/playlist/abc",
    });

    expect(stubs.trackService.create).not.toHaveBeenCalled();
  });

  it("skips unavailable track", async () => {
    stubs.spotifyService.getPlaylistDetail.mockResolvedValue({
      tracks: [
        {
          name: "Unavailable Track",
          artist: "Artist",
          artists: [{ name: "Artist", url: undefined }],
          album: "Album",
          trackNumber: 1,
          durationMs: 200000,
          trackUrl: "https://open.spotify.com/track/t1",
          unavailable: true,
        },
      ],
      name: "My Playlist",
      image: "",
      type: "playlist",
      owner: "user",
      ownerUrl: undefined,
    });

    const useCase = makeUseCase(stubs);
    await useCase.execute({
      kind: "spotifyUrl",
      spotifyUrl: "https://open.spotify.com/playlist/abc",
    });

    expect(stubs.trackService.create).not.toHaveBeenCalled();
  });

  it("uses primaryArtist for album-type playlist when primaryArtist is set", async () => {
    stubs.spotifyService.getPlaylistDetail.mockResolvedValue({
      tracks: [
        {
          name: "Song",
          artist: "Secondary",
          primaryArtist: "Primary",
          artists: [{ name: "Primary", url: undefined }],
          album: "Album",
          trackNumber: 1,
          durationMs: 200000,
          trackUrl: "https://open.spotify.com/track/t1",
        },
      ],
      name: "Album",
      image: "",
      type: "album",
      owner: "user",
      ownerUrl: undefined,
    });

    const useCase = makeUseCase(stubs);
    await useCase.execute({ kind: "spotifyUrl", spotifyUrl: "https://open.spotify.com/album/abc" });

    expect(stubs.trackService.create).toHaveBeenCalledWith(
      expect.objectContaining({ artist: "Primary" }),
    );
  });

  it("uses artist fallback when primaryArtist is absent for album type", async () => {
    stubs.spotifyService.getPlaylistDetail.mockResolvedValue({
      tracks: [
        {
          name: "Song",
          artist: "Secondary",
          primaryArtist: undefined,
          artists: [{ name: "Secondary", url: undefined }],
          album: "Album",
          trackNumber: 1,
          durationMs: 200000,
          trackUrl: "https://open.spotify.com/track/t1",
        },
      ],
      name: "Album",
      image: "",
      type: "album",
      owner: "user",
      ownerUrl: undefined,
    });

    const useCase = makeUseCase(stubs);
    await useCase.execute({ kind: "spotifyUrl", spotifyUrl: "https://open.spotify.com/album/abc" });

    expect(stubs.trackService.create).toHaveBeenCalledWith(
      expect.objectContaining({ artist: "Secondary" }),
    );
  });

  it("album defaults to Singles when track has no album and context is track type", async () => {
    stubs.spotifyService.getPlaylistDetail.mockResolvedValue({
      tracks: [
        {
          name: "Single Song",
          artist: "Artist",
          primaryArtist: "Artist",
          artists: [{ name: "Artist", url: undefined }],
          album: undefined,
          trackNumber: 1,
          durationMs: 200000,
          trackUrl: "https://open.spotify.com/track/t1",
        },
      ],
      name: "Single Song",
      image: "",
      type: "track",
      owner: "user",
      ownerUrl: undefined,
    });

    const useCase = makeUseCase(stubs);
    await useCase.execute({ kind: "spotifyUrl", spotifyUrl: "https://open.spotify.com/track/abc" });

    expect(stubs.trackService.create).toHaveBeenCalledWith(
      expect.objectContaining({ album: "Singles" }),
    );
  });

  it("trackService.create error does not throw from execute — eventBus still emits", async () => {
    stubs.spotifyService.getPlaylistDetail.mockResolvedValue({
      tracks: [
        {
          name: "Failing Track",
          artist: "Artist",
          artists: [{ name: "Artist", url: undefined }],
          album: "Album",
          trackNumber: 1,
          durationMs: 200000,
          trackUrl: "https://open.spotify.com/track/t1",
        },
      ],
      name: "My Playlist",
      image: "",
      type: "playlist",
      owner: "user",
      ownerUrl: undefined,
    });
    stubs.trackService.create.mockRejectedValue(new Error("DB constraint"));

    const useCase = makeUseCase(stubs);
    await expect(
      useCase.execute({ kind: "spotifyUrl", spotifyUrl: "https://open.spotify.com/playlist/abc" }),
    ).resolves.toBeDefined();

    expect(stubs.eventBus.emit).toHaveBeenCalledWith("playlists-updated");
  });
});
