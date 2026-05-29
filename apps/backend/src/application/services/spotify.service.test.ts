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
});
