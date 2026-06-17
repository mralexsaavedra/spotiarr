import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/domain/errors/app-error";
import { SpotifyService } from "./spotify.service";

describe("SpotifyService", () => {
  it("enriches track downloads with the primary artist image", async () => {
    const artistClient = {
      getArtistDetails: vi.fn().mockResolvedValue({
        name: "Artist",
        image: "https://image.test/artist.jpg",
        spotifyUrl: "https://open.spotify.com/artist/abc123",
        followers: null,
        genres: [],
      }),
    };

    const service = new SpotifyService({
      artistClient,
      trackClient: {
        getTrackDetails: vi.fn().mockResolvedValue({
          name: "Track",
          artist: "Artist",
          primaryArtist: "Artist",
          primaryArtistImage: null,
          album: "Album",
          albumCoverUrl: "https://image.test/album.jpg",
          artists: [{ name: "Artist", url: "https://open.spotify.com/artist/abc123" }],
        }),
      },
      albumClient: {
        getAlbumTracks: vi.fn(),
        getAlbumDetails: vi.fn(),
      },
      playlistClient: {
        getPlaylistMetadata: vi.fn(),
        getAllPlaylistTracks: vi.fn(),
        getPlaylistTracksPage: vi.fn(),
      },
      searchClient: {
        searchCatalog: vi.fn(),
      },
      userLibraryService: {
        getMyPlaylists: vi.fn(),
      },
    });

    const result = await service.getPlaylistDetail("https://open.spotify.com/track/track123");

    expect(artistClient.getArtistDetails).toHaveBeenCalledWith("abc123");
    expect(result.tracks[0]?.primaryArtistImage).toBe("https://image.test/artist.jpg");
    expect(result.tracks[0]?.albumCoverUrl).toBe("https://image.test/album.jpg");
  });

  it("enriches album downloads with the primary artist image without using album cover fallback", async () => {
    const artistClient = {
      getArtistDetails: vi.fn().mockResolvedValue({
        name: "Artist",
        image: "https://image.test/artist.jpg",
        spotifyUrl: "https://open.spotify.com/artist/abc123",
        followers: null,
        genres: [],
      }),
    };

    const service = new SpotifyService({
      artistClient,
      trackClient: {
        getTrackDetails: vi.fn(),
      },
      albumClient: {
        getAlbumTracks: vi.fn().mockResolvedValue([
          {
            name: "Track 1",
            artist: "Artist",
            primaryArtist: "Artist",
            primaryArtistImage: null,
            album: "Album",
            albumCoverUrl: "https://image.test/album.jpg",
            artists: [{ name: "Artist", url: "https://open.spotify.com/artist/abc123" }],
          },
          {
            name: "Track 2",
            artist: "Artist",
            primaryArtist: "Artist",
            primaryArtistImage: null,
            album: "Album",
            albumCoverUrl: "https://image.test/album.jpg",
            artists: [{ name: "Artist", url: "https://open.spotify.com/artist/abc123" }],
          },
        ]),
        getAlbumDetails: vi.fn(),
      },
      playlistClient: {
        getPlaylistMetadata: vi.fn(),
        getAllPlaylistTracks: vi.fn(),
        getPlaylistTracksPage: vi.fn(),
      },
      searchClient: {
        searchCatalog: vi.fn(),
      },
      userLibraryService: {
        getMyPlaylists: vi.fn(),
      },
    });

    const result = await service.getPlaylistDetail("https://open.spotify.com/album/album123");

    expect(artistClient.getArtistDetails).toHaveBeenCalledTimes(1);
    expect(result.tracks[0]?.primaryArtistImage).toBe("https://image.test/artist.jpg");
    expect(result.tracks[0]?.primaryArtistImage).not.toBe(result.tracks[0]?.albumCoverUrl);
    expect(result.tracks[1]?.primaryArtistImage).toBe("https://image.test/artist.jpg");
  });

  describe("getPlaylistMetadata", () => {
    it("delegates to playlistClient.getPlaylistMetadata with the same URL", async () => {
      const metadata = {
        name: "My Playlist",
        image: "https://image.test/cover.jpg",
        owner: "alex",
        ownerUrl: "https://open.spotify.com/user/alex",
        totalTracks: 20,
      };
      const playlistClient = {
        getPlaylistMetadata: vi.fn().mockResolvedValue(metadata),
        getAllPlaylistTracks: vi.fn(),
        getPlaylistTracksPage: vi.fn(),
      };
      const service = new SpotifyService({
        artistClient: { getArtistDetails: vi.fn() },
        trackClient: { getTrackDetails: vi.fn() },
        albumClient: { getAlbumTracks: vi.fn(), getAlbumDetails: vi.fn() },
        playlistClient,
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      const url = "https://open.spotify.com/playlist/abc123";
      const result = await service.getPlaylistMetadata(url);

      expect(playlistClient.getPlaylistMetadata).toHaveBeenCalledWith(url);
      expect(result).toEqual(metadata);
    });

    it("returns the metadata shape unchanged (name, image, owner, ownerUrl, totalTracks)", async () => {
      const metadata = {
        name: "Radio Alexander",
        image: "https://image.test/playlist.jpg",
        owner: "user1",
        ownerUrl: "https://open.spotify.com/user/user1",
        totalTracks: 75,
      };
      const playlistClient = {
        getPlaylistMetadata: vi.fn().mockResolvedValue(metadata),
        getAllPlaylistTracks: vi.fn(),
        getPlaylistTracksPage: vi.fn(),
      };
      const service = new SpotifyService({
        artistClient: { getArtistDetails: vi.fn() },
        trackClient: { getTrackDetails: vi.fn() },
        albumClient: { getAlbumTracks: vi.fn(), getAlbumDetails: vi.fn() },
        playlistClient,
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      const result = await service.getPlaylistMetadata("https://open.spotify.com/playlist/xyz");

      expect(result).toMatchObject({
        name: "Radio Alexander",
        image: "https://image.test/playlist.jpg",
        owner: "user1",
        ownerUrl: "https://open.spotify.com/user/user1",
        totalTracks: 75,
      });
    });

    it("propagates errors from the client", async () => {
      const clientError = new Error("Spotify API error");
      const playlistClient = {
        getPlaylistMetadata: vi.fn().mockRejectedValue(clientError),
        getAllPlaylistTracks: vi.fn(),
        getPlaylistTracksPage: vi.fn(),
      };
      const service = new SpotifyService({
        artistClient: { getArtistDetails: vi.fn() },
        trackClient: { getTrackDetails: vi.fn() },
        albumClient: { getAlbumTracks: vi.fn(), getAlbumDetails: vi.fn() },
        playlistClient,
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      await expect(
        service.getPlaylistMetadata("https://open.spotify.com/playlist/err"),
      ).rejects.toThrow("Spotify API error");
    });
  });

  it("returns playlist totalTracks from metadata even when preview tracks are paged", async () => {
    const service = new SpotifyService({
      artistClient: {
        getArtistDetails: vi.fn(),
      },
      trackClient: {
        getTrackDetails: vi.fn(),
      },
      albumClient: {
        getAlbumTracks: vi.fn(),
        getAlbumDetails: vi.fn(),
      },
      playlistClient: {
        getPlaylistMetadata: vi.fn().mockResolvedValue({
          name: "Radio Alexander",
          image: "https://image.test/playlist.jpg",
          owner: "alex",
          ownerUrl: "https://open.spotify.com/user/alex",
          totalTracks: 75,
        }),
        getAllPlaylistTracks: vi.fn().mockResolvedValue([
          { name: "Track 1", artist: "Artist", artists: [] },
          { name: "Track 2", artist: "Artist", artists: [] },
        ]),
        getPlaylistTracksPage: vi.fn(),
      },
      searchClient: {
        searchCatalog: vi.fn(),
      },
      userLibraryService: {
        getMyPlaylists: vi.fn(),
      },
    });

    const result = await service.getPlaylistDetail(
      "https://open.spotify.com/playlist/playlist123",
      true,
    );

    expect(result.totalTracks).toBe(75);
    expect(result.tracks).toHaveLength(2);
  });

  // ---------------------------------------------------------------------------
  // getPlaylistDetail — Artist URL (throws AppError 400)
  // ---------------------------------------------------------------------------

  describe("getPlaylistDetail — artist URL", () => {
    it("throws AppError 400 for an artist URL", async () => {
      const service = new SpotifyService({
        artistClient: { getArtistDetails: vi.fn() },
        trackClient: { getTrackDetails: vi.fn() },
        albumClient: { getAlbumTracks: vi.fn(), getAlbumDetails: vi.fn() },
        playlistClient: {
          getPlaylistMetadata: vi.fn(),
          getAllPlaylistTracks: vi.fn(),
          getPlaylistTracksPage: vi.fn(),
        },
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      await expect(
        service.getPlaylistDetail("https://open.spotify.com/artist/abc123"),
      ).rejects.toBeInstanceOf(AppError);
    });

    it("includes invalid_spotify_url error code for artist URL", async () => {
      const service = new SpotifyService({
        artistClient: { getArtistDetails: vi.fn() },
        trackClient: { getTrackDetails: vi.fn() },
        albumClient: { getAlbumTracks: vi.fn(), getAlbumDetails: vi.fn() },
        playlistClient: {
          getPlaylistMetadata: vi.fn(),
          getAllPlaylistTracks: vi.fn(),
          getPlaylistTracksPage: vi.fn(),
        },
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      const err = await service
        .getPlaylistDetail("https://open.spotify.com/artist/abc123")
        .catch((e) => e);
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(400);
      expect((err as AppError).errorCode).toBe("invalid_spotify_url");
    });
  });

  // ---------------------------------------------------------------------------
  // getPlaylistDetail — error propagation
  // ---------------------------------------------------------------------------

  describe("getPlaylistDetail — error propagation", () => {
    it("re-throws errors from trackClient", async () => {
      const service = new SpotifyService({
        artistClient: { getArtistDetails: vi.fn() },
        trackClient: {
          getTrackDetails: vi.fn().mockRejectedValue(new Error("track fetch failed")),
        },
        albumClient: { getAlbumTracks: vi.fn(), getAlbumDetails: vi.fn() },
        playlistClient: {
          getPlaylistMetadata: vi.fn(),
          getAllPlaylistTracks: vi.fn(),
          getPlaylistTracksPage: vi.fn(),
        },
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      await expect(
        service.getPlaylistDetail("https://open.spotify.com/track/abc123"),
      ).rejects.toThrow("track fetch failed");
    });

    it("re-throws errors from albumClient", async () => {
      const service = new SpotifyService({
        artistClient: { getArtistDetails: vi.fn() },
        trackClient: { getTrackDetails: vi.fn() },
        albumClient: {
          getAlbumTracks: vi.fn().mockRejectedValue(new Error("album fetch failed")),
          getAlbumDetails: vi.fn(),
        },
        playlistClient: {
          getPlaylistMetadata: vi.fn(),
          getAllPlaylistTracks: vi.fn(),
          getPlaylistTracksPage: vi.fn(),
        },
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      await expect(
        service.getPlaylistDetail("https://open.spotify.com/album/abc123"),
      ).rejects.toThrow("album fetch failed");
    });
  });

  // ---------------------------------------------------------------------------
  // getPlaylistDetail — album with no tracks (empty array edge-case)
  // ---------------------------------------------------------------------------

  it("returns 'Unknown Album' name when album has no tracks", async () => {
    const service = new SpotifyService({
      artistClient: { getArtistDetails: vi.fn() },
      trackClient: { getTrackDetails: vi.fn() },
      albumClient: {
        getAlbumTracks: vi.fn().mockResolvedValue([]),
        getAlbumDetails: vi.fn(),
      },
      playlistClient: {
        getPlaylistMetadata: vi.fn(),
        getAllPlaylistTracks: vi.fn(),
        getPlaylistTracksPage: vi.fn(),
      },
      searchClient: { searchCatalog: vi.fn() },
      userLibraryService: { getMyPlaylists: vi.fn() },
    });

    const result = await service.getPlaylistDetail("https://open.spotify.com/album/empty123");
    expect(result.name).toBe("Unknown Album");
    expect(result.tracks).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // getCoverImage
  // ---------------------------------------------------------------------------

  describe("getCoverImage", () => {
    it("returns track albumCoverUrl for a track URL", async () => {
      const service = new SpotifyService({
        artistClient: { getArtistDetails: vi.fn() },
        trackClient: {
          getTrackDetails: vi.fn().mockResolvedValue({
            name: "Track",
            albumCoverUrl: "https://image.test/cover.jpg",
            artists: [],
          }),
        },
        albumClient: { getAlbumTracks: vi.fn(), getAlbumDetails: vi.fn() },
        playlistClient: {
          getPlaylistMetadata: vi.fn(),
          getAllPlaylistTracks: vi.fn(),
          getPlaylistTracksPage: vi.fn(),
        },
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      const url = await service.getCoverImage("https://open.spotify.com/track/abc123");
      expect(url).toBe("https://image.test/cover.jpg");
    });

    it("returns empty string when track albumCoverUrl is null", async () => {
      const service = new SpotifyService({
        artistClient: { getArtistDetails: vi.fn() },
        trackClient: {
          getTrackDetails: vi.fn().mockResolvedValue({
            name: "Track",
            albumCoverUrl: null,
            artists: [],
          }),
        },
        albumClient: { getAlbumTracks: vi.fn(), getAlbumDetails: vi.fn() },
        playlistClient: {
          getPlaylistMetadata: vi.fn(),
          getAllPlaylistTracks: vi.fn(),
          getPlaylistTracksPage: vi.fn(),
        },
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      const url = await service.getCoverImage("https://open.spotify.com/track/abc123");
      expect(url).toBe("");
    });

    it("returns first album image url for an album URL", async () => {
      const service = new SpotifyService({
        artistClient: { getArtistDetails: vi.fn() },
        trackClient: { getTrackDetails: vi.fn() },
        albumClient: {
          getAlbumTracks: vi.fn(),
          getAlbumDetails: vi.fn().mockResolvedValue({
            images: [{ url: "https://image.test/album.jpg" }, { url: "https://image.test/sm.jpg" }],
          }),
        },
        playlistClient: {
          getPlaylistMetadata: vi.fn(),
          getAllPlaylistTracks: vi.fn(),
          getPlaylistTracksPage: vi.fn(),
        },
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      const url = await service.getCoverImage("https://open.spotify.com/album/abc123");
      expect(url).toBe("https://image.test/album.jpg");
    });

    it("returns empty string when album has no images", async () => {
      const service = new SpotifyService({
        artistClient: { getArtistDetails: vi.fn() },
        trackClient: { getTrackDetails: vi.fn() },
        albumClient: {
          getAlbumTracks: vi.fn(),
          getAlbumDetails: vi.fn().mockResolvedValue({ images: [] }),
        },
        playlistClient: {
          getPlaylistMetadata: vi.fn(),
          getAllPlaylistTracks: vi.fn(),
          getPlaylistTracksPage: vi.fn(),
        },
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      const url = await service.getCoverImage("https://open.spotify.com/album/abc123");
      expect(url).toBe("");
    });

    it("returns playlist image for a playlist URL", async () => {
      const service = new SpotifyService({
        artistClient: { getArtistDetails: vi.fn() },
        trackClient: { getTrackDetails: vi.fn() },
        albumClient: { getAlbumTracks: vi.fn(), getAlbumDetails: vi.fn() },
        playlistClient: {
          getPlaylistMetadata: vi.fn().mockResolvedValue({
            name: "My Playlist",
            image: "https://image.test/playlist.jpg",
          }),
          getAllPlaylistTracks: vi.fn(),
          getPlaylistTracksPage: vi.fn(),
        },
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      const url = await service.getCoverImage("https://open.spotify.com/playlist/abc123");
      expect(url).toBe("https://image.test/playlist.jpg");
    });

    it("returns empty string for an artist URL (no matching branch)", async () => {
      const service = new SpotifyService({
        artistClient: { getArtistDetails: vi.fn() },
        trackClient: { getTrackDetails: vi.fn() },
        albumClient: { getAlbumTracks: vi.fn(), getAlbumDetails: vi.fn() },
        playlistClient: {
          getPlaylistMetadata: vi.fn(),
          getAllPlaylistTracks: vi.fn(),
          getPlaylistTracksPage: vi.fn(),
        },
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      const url = await service.getCoverImage("https://open.spotify.com/artist/abc123");
      expect(url).toBe("");
    });

    it("returns empty string when client throws (swallows error)", async () => {
      const service = new SpotifyService({
        artistClient: { getArtistDetails: vi.fn() },
        trackClient: {
          getTrackDetails: vi.fn().mockRejectedValue(new Error("network error")),
        },
        albumClient: { getAlbumTracks: vi.fn(), getAlbumDetails: vi.fn() },
        playlistClient: {
          getPlaylistMetadata: vi.fn(),
          getAllPlaylistTracks: vi.fn(),
          getPlaylistTracksPage: vi.fn(),
        },
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      const url = await service.getCoverImage("https://open.spotify.com/track/abc123");
      expect(url).toBe("");
    });
  });

  // ---------------------------------------------------------------------------
  // getPlaylistTracks
  // ---------------------------------------------------------------------------

  describe("getPlaylistTracks", () => {
    it("returns tracks from playlistClient.getAllPlaylistTracks", async () => {
      const tracks = [{ name: "Track 1", artists: [] }];
      const service = new SpotifyService({
        artistClient: { getArtistDetails: vi.fn() },
        trackClient: { getTrackDetails: vi.fn() },
        albumClient: { getAlbumTracks: vi.fn(), getAlbumDetails: vi.fn() },
        playlistClient: {
          getPlaylistMetadata: vi.fn(),
          getAllPlaylistTracks: vi.fn().mockResolvedValue(tracks),
          getPlaylistTracksPage: vi.fn(),
        },
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      const result = await service.getPlaylistTracks("https://open.spotify.com/playlist/abc123");
      expect(result).toEqual(tracks);
    });

    it("returns empty array when playlistClient throws", async () => {
      const service = new SpotifyService({
        artistClient: { getArtistDetails: vi.fn() },
        trackClient: { getTrackDetails: vi.fn() },
        albumClient: { getAlbumTracks: vi.fn(), getAlbumDetails: vi.fn() },
        playlistClient: {
          getPlaylistMetadata: vi.fn(),
          getAllPlaylistTracks: vi.fn().mockRejectedValue(new Error("network error")),
          getPlaylistTracksPage: vi.fn(),
        },
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      const result = await service.getPlaylistTracks("https://open.spotify.com/playlist/abc123");
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getPlaylistTracksPage
  // ---------------------------------------------------------------------------

  describe("getPlaylistTracksPage", () => {
    it("delegates to playlistClient.getPlaylistTracksPage and returns result", async () => {
      const pageResult = {
        tracks: [{ name: "Track 1", artists: [] }],
        total: 50,
        hasMore: true,
        nextOffset: 20,
      };
      const playlistClient = {
        getPlaylistMetadata: vi.fn(),
        getAllPlaylistTracks: vi.fn(),
        getPlaylistTracksPage: vi.fn().mockResolvedValue(pageResult),
      };
      const service = new SpotifyService({
        artistClient: { getArtistDetails: vi.fn() },
        trackClient: { getTrackDetails: vi.fn() },
        albumClient: { getAlbumTracks: vi.fn(), getAlbumDetails: vi.fn() },
        playlistClient,
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      const url = "https://open.spotify.com/playlist/abc123";
      const result = await service.getPlaylistTracksPage(url, 0, 20);

      expect(playlistClient.getPlaylistTracksPage).toHaveBeenCalledWith(url, 0, 20);
      expect(result).toEqual(pageResult);
    });

    it("re-throws errors from playlistClient.getPlaylistTracksPage", async () => {
      const service = new SpotifyService({
        artistClient: { getArtistDetails: vi.fn() },
        trackClient: { getTrackDetails: vi.fn() },
        albumClient: { getAlbumTracks: vi.fn(), getAlbumDetails: vi.fn() },
        playlistClient: {
          getPlaylistMetadata: vi.fn(),
          getAllPlaylistTracks: vi.fn(),
          getPlaylistTracksPage: vi.fn().mockRejectedValue(new Error("paged fetch failed")),
        },
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      await expect(
        service.getPlaylistTracksPage("https://open.spotify.com/playlist/abc123", 0, 20),
      ).rejects.toThrow("paged fetch failed");
    });
  });

  // ---------------------------------------------------------------------------
  // getMyPlaylists
  // ---------------------------------------------------------------------------

  describe("getMyPlaylists", () => {
    it("delegates to userLibraryService.getMyPlaylists and returns result", async () => {
      const playlists = [{ id: "p1", name: "My Playlist" }];
      const userLibraryService = { getMyPlaylists: vi.fn().mockResolvedValue(playlists) };
      const service = new SpotifyService({
        artistClient: { getArtistDetails: vi.fn() },
        trackClient: { getTrackDetails: vi.fn() },
        albumClient: { getAlbumTracks: vi.fn(), getAlbumDetails: vi.fn() },
        playlistClient: {
          getPlaylistMetadata: vi.fn(),
          getAllPlaylistTracks: vi.fn(),
          getPlaylistTracksPage: vi.fn(),
        },
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService,
      });

      const result = await service.getMyPlaylists();
      expect(result).toEqual(playlists);
      expect(userLibraryService.getMyPlaylists).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // searchCatalog
  // ---------------------------------------------------------------------------

  describe("searchCatalog", () => {
    it("delegates to searchClient.searchCatalog and returns result", async () => {
      const searchResults = { tracks: [], albums: [], artists: [] };
      const searchClient = { searchCatalog: vi.fn().mockResolvedValue(searchResults) };
      const service = new SpotifyService({
        artistClient: { getArtistDetails: vi.fn() },
        trackClient: { getTrackDetails: vi.fn() },
        albumClient: { getAlbumTracks: vi.fn(), getAlbumDetails: vi.fn() },
        playlistClient: {
          getPlaylistMetadata: vi.fn(),
          getAllPlaylistTracks: vi.fn(),
          getPlaylistTracksPage: vi.fn(),
        },
        searchClient,
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      const result = await service.searchCatalog("rock", ["track"], { track: 10 });
      expect(searchClient.searchCatalog).toHaveBeenCalledWith("rock", ["track"], { track: 10 });
      expect(result).toEqual(searchResults);
    });

    it("works without optional types and limits args", async () => {
      const searchResults = { tracks: [], albums: [], artists: [] };
      const searchClient = { searchCatalog: vi.fn().mockResolvedValue(searchResults) };
      const service = new SpotifyService({
        artistClient: { getArtistDetails: vi.fn() },
        trackClient: { getTrackDetails: vi.fn() },
        albumClient: { getAlbumTracks: vi.fn(), getAlbumDetails: vi.fn() },
        playlistClient: {
          getPlaylistMetadata: vi.fn(),
          getAllPlaylistTracks: vi.fn(),
          getPlaylistTracksPage: vi.fn(),
        },
        searchClient,
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      const result = await service.searchCatalog("jazz");
      expect(searchClient.searchCatalog).toHaveBeenCalledWith("jazz", undefined, undefined);
      expect(result).toEqual(searchResults);
    });
  });

  // ---------------------------------------------------------------------------
  // populatePrimaryArtistImages — internal edge cases
  // ---------------------------------------------------------------------------

  describe("populatePrimaryArtistImages edge cases", () => {
    it("returns track unchanged when primaryArtistImage is already set", async () => {
      const artistClient = { getArtistDetails: vi.fn() };
      const service = new SpotifyService({
        artistClient,
        trackClient: {
          getTrackDetails: vi.fn().mockResolvedValue({
            name: "Track",
            albumCoverUrl: "https://image.test/album.jpg",
            primaryArtistImage: "https://existing.image/artist.jpg",
            artists: [{ name: "Artist", url: "https://open.spotify.com/artist/abc123" }],
          }),
        },
        albumClient: { getAlbumTracks: vi.fn(), getAlbumDetails: vi.fn() },
        playlistClient: {
          getPlaylistMetadata: vi.fn(),
          getAllPlaylistTracks: vi.fn(),
          getPlaylistTracksPage: vi.fn(),
        },
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      const result = await service.getPlaylistDetail("https://open.spotify.com/track/abc123");
      // Already has primaryArtistImage — should not call artistClient at all
      expect(artistClient.getArtistDetails).not.toHaveBeenCalled();
      expect(result.tracks[0]?.primaryArtistImage).toBe("https://existing.image/artist.jpg");
    });

    it("returns track unchanged when artists array is empty (no primaryArtistUrl)", async () => {
      const artistClient = { getArtistDetails: vi.fn() };
      const service = new SpotifyService({
        artistClient,
        trackClient: {
          getTrackDetails: vi.fn().mockResolvedValue({
            name: "Track",
            albumCoverUrl: "https://image.test/album.jpg",
            primaryArtistImage: null,
            artists: [],
          }),
        },
        albumClient: { getAlbumTracks: vi.fn(), getAlbumDetails: vi.fn() },
        playlistClient: {
          getPlaylistMetadata: vi.fn(),
          getAllPlaylistTracks: vi.fn(),
          getPlaylistTracksPage: vi.fn(),
        },
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      const result = await service.getPlaylistDetail("https://open.spotify.com/track/abc123");
      expect(artistClient.getArtistDetails).not.toHaveBeenCalled();
      expect(result.tracks[0]?.primaryArtistImage).toBeNull();
    });

    it("returns track unchanged when artistClient returns null image", async () => {
      const artistClient = {
        getArtistDetails: vi.fn().mockResolvedValue({
          name: "Artist",
          image: null,
          spotifyUrl: null,
          followers: null,
          genres: [],
        }),
      };
      const service = new SpotifyService({
        artistClient,
        trackClient: {
          getTrackDetails: vi.fn().mockResolvedValue({
            name: "Track",
            albumCoverUrl: "https://image.test/album.jpg",
            primaryArtistImage: null,
            artists: [{ name: "Artist", url: "https://open.spotify.com/artist/abc123" }],
          }),
        },
        albumClient: { getAlbumTracks: vi.fn(), getAlbumDetails: vi.fn() },
        playlistClient: {
          getPlaylistMetadata: vi.fn(),
          getAllPlaylistTracks: vi.fn(),
          getPlaylistTracksPage: vi.fn(),
        },
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      const result = await service.getPlaylistDetail("https://open.spotify.com/track/abc123");
      // null image → returns track as-is, primaryArtistImage remains null
      expect(result.tracks[0]?.primaryArtistImage).toBeNull();
    });

    it("returns track unchanged when artistClient throws (swallows error)", async () => {
      const artistClient = {
        getArtistDetails: vi.fn().mockRejectedValue(new Error("artist fetch failed")),
      };
      const service = new SpotifyService({
        artistClient,
        trackClient: {
          getTrackDetails: vi.fn().mockResolvedValue({
            name: "Track",
            albumCoverUrl: "https://image.test/album.jpg",
            primaryArtistImage: null,
            artists: [{ name: "Artist", url: "https://open.spotify.com/artist/abc123" }],
          }),
        },
        albumClient: { getAlbumTracks: vi.fn(), getAlbumDetails: vi.fn() },
        playlistClient: {
          getPlaylistMetadata: vi.fn(),
          getAllPlaylistTracks: vi.fn(),
          getPlaylistTracksPage: vi.fn(),
        },
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      // Should not throw — error is swallowed inside populatePrimaryArtistImages
      const result = await service.getPlaylistDetail("https://open.spotify.com/track/abc123");
      expect(result.tracks[0]?.primaryArtistImage).toBeNull();
    });

    it("returns track unchanged when SpotifyUrlHelper.extractId throws on invalid artist URL", async () => {
      const artistClient = { getArtistDetails: vi.fn() };
      const service = new SpotifyService({
        artistClient,
        trackClient: {
          getTrackDetails: vi.fn().mockResolvedValue({
            name: "Track",
            albumCoverUrl: "https://image.test/album.jpg",
            primaryArtistImage: null,
            // artists[0].url is missing the expected path segment — extractId will throw
            artists: [{ name: "Artist", url: "not-a-valid-spotify-url" }],
          }),
        },
        albumClient: { getAlbumTracks: vi.fn(), getAlbumDetails: vi.fn() },
        playlistClient: {
          getPlaylistMetadata: vi.fn(),
          getAllPlaylistTracks: vi.fn(),
          getPlaylistTracksPage: vi.fn(),
        },
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      // extractId throws for invalid URL → catch block returns track as-is
      const result = await service.getPlaylistDetail("https://open.spotify.com/track/abc123");
      expect(artistClient.getArtistDetails).not.toHaveBeenCalled();
      expect(result.tracks[0]?.primaryArtistImage).toBeNull();
    });

    it("caches the artist lookup across multiple tracks with the same artist", async () => {
      const artistClient = {
        getArtistDetails: vi.fn().mockResolvedValue({
          name: "Artist",
          image: "https://image.test/artist.jpg",
          spotifyUrl: null,
          followers: null,
          genres: [],
        }),
      };
      const trackTemplate = {
        primaryArtistImage: null,
        album: "Album",
        albumCoverUrl: "https://image.test/album.jpg",
        artists: [{ name: "Artist", url: "https://open.spotify.com/artist/shared-id" }],
      };
      const service = new SpotifyService({
        artistClient,
        trackClient: { getTrackDetails: vi.fn() },
        albumClient: {
          getAlbumTracks: vi.fn().mockResolvedValue([
            { ...trackTemplate, name: "Track 1" },
            { ...trackTemplate, name: "Track 2" },
            { ...trackTemplate, name: "Track 3" },
          ]),
          getAlbumDetails: vi.fn(),
        },
        playlistClient: {
          getPlaylistMetadata: vi.fn(),
          getAllPlaylistTracks: vi.fn(),
          getPlaylistTracksPage: vi.fn(),
        },
        searchClient: { searchCatalog: vi.fn() },
        userLibraryService: { getMyPlaylists: vi.fn() },
      });

      const result = await service.getPlaylistDetail("https://open.spotify.com/album/abc123");
      // Cache means only 1 API call for 3 tracks sharing the same artist
      expect(artistClient.getArtistDetails).toHaveBeenCalledTimes(1);
      expect(result.tracks).toHaveLength(3);
      result.tracks.forEach((t) => {
        expect(t.primaryArtistImage).toBe("https://image.test/artist.jpg");
      });
    });
  });
});
