import { describe, expect, it, vi } from "vitest";
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

      const result = await service.getPlaylistMetadata(
        "https://open.spotify.com/playlist/xyz",
      );

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
});
