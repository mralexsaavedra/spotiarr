import { describe, it, expect } from "vitest";
import { SpotifyTrackMapper } from "./spotify-track.mapper";
import type { SpotifyAlbum, SpotifyTrack } from "./spotify.types";

function makeTrack(overrides: Partial<SpotifyTrack> = {}): SpotifyTrack {
  return {
    id: "track-1",
    name: "Test Track",
    artists: [
      { name: "Artist One", external_urls: { spotify: "https://open.spotify.com/artist/1" } },
    ],
    album: {
      name: "Test Album",
      external_urls: { spotify: "https://open.spotify.com/album/1" },
      images: [{ url: "https://i.scdn.co/image/cover.jpg" }],
      release_date: "2020-06-12",
      total_tracks: 10,
      artists: [
        {
          name: "Album Artist",
          external_urls: { spotify: "https://open.spotify.com/artist/album" },
        },
      ],
    } as SpotifyAlbum,
    external_urls: { spotify: "https://open.spotify.com/track/1" },
    preview_url: "https://p.scdn.co/preview/1",
    duration_ms: 210000,
    track_number: 3,
    disc_number: 1,
    ...overrides,
  } as SpotifyTrack;
}

describe("SpotifyTrackMapper.toNormalizedTrack", () => {
  it("maps a full SpotifyTrack with all fields", () => {
    const track = makeTrack();
    const result = SpotifyTrackMapper.toNormalizedTrack(track);

    expect(result.name).toBe("Test Track");
    expect(result.artist).toBe("Artist One");
    expect(result.album).toBe("Test Album");
    expect(result.albumUrl).toBe("https://open.spotify.com/album/1");
    expect(result.albumCoverUrl).toBe("https://i.scdn.co/image/cover.jpg");
    expect(result.albumYear).toBe(2020);
    expect(result.trackUrl).toBe("https://open.spotify.com/track/1");
    expect(result.previewUrl).toBe("https://p.scdn.co/preview/1");
    expect(result.durationMs).toBe(210000);
    expect(result.trackNumber).toBe(3);
    expect(result.discNumber).toBe(1);
    expect(result.totalTracks).toBe(10);
    expect(result.primaryArtist).toBe("Artist One");
    expect(result.artists).toEqual([
      { name: "Artist One", url: "https://open.spotify.com/artist/1" },
    ]);
  });

  it("joins multiple artists with a comma", () => {
    const track = makeTrack({
      artists: [
        { name: "Artist A", external_urls: { spotify: "https://open.spotify.com/artist/a" } },
        { name: "Artist B", external_urls: { spotify: "https://open.spotify.com/artist/b" } },
        { name: "Artist C", external_urls: { spotify: "https://open.spotify.com/artist/c" } },
      ],
    });
    const result = SpotifyTrackMapper.toNormalizedTrack(track);

    expect(result.artist).toBe("Artist A, Artist B, Artist C");
    expect(result.primaryArtist).toBe("Artist A");
    expect(result.artists).toHaveLength(3);
  });

  it("returns undefined album fields when track has no album", () => {
    const track = makeTrack({ album: undefined });
    const result = SpotifyTrackMapper.toNormalizedTrack(track);

    expect(result.album).toBeUndefined();
    expect(result.albumUrl).toBeUndefined();
    expect(result.albumCoverUrl).toBeUndefined();
    expect(result.albumYear).toBeUndefined();
    expect(result.totalTracks).toBeUndefined();
    expect(result.albumArtist).toBeUndefined();
  });

  it("prefers context.albumCoverUrl over track.album.images[0].url", () => {
    const track = makeTrack();
    const result = SpotifyTrackMapper.toNormalizedTrack(track, {
      albumCoverUrl: "https://context.example.com/cover.jpg",
    });

    expect(result.albumCoverUrl).toBe("https://context.example.com/cover.jpg");
  });

  it("extracts albumYear from the first 4 chars of release_date", () => {
    const track = makeTrack({
      album: {
        ...makeTrack().album!,
        release_date: "2020-06-12",
      } as SpotifyAlbum,
    });
    const result = SpotifyTrackMapper.toNormalizedTrack(track);

    expect(result.albumYear).toBe(2020);
  });

  it("sets unavailable=true when context.isUnavailable is true", () => {
    const track = makeTrack();
    const result = SpotifyTrackMapper.toNormalizedTrack(track, { isUnavailable: true });

    expect(result.unavailable).toBe(true);
  });

  it("leaves unavailable undefined when isUnavailable is not set", () => {
    const track = makeTrack();
    const result = SpotifyTrackMapper.toNormalizedTrack(track);

    expect(result.unavailable).toBeUndefined();
  });

  it("uses album.artists[0].name as albumArtist", () => {
    const track = makeTrack();
    const result = SpotifyTrackMapper.toNormalizedTrack(track);

    expect(result.albumArtist).toBe("Album Artist");
  });

  it("uses context.primaryArtistImage when provided", () => {
    const track = makeTrack();
    const result = SpotifyTrackMapper.toNormalizedTrack(track, {
      primaryArtistImage: "https://i.scdn.co/image/artist.jpg",
    });

    expect(result.primaryArtistImage).toBe("https://i.scdn.co/image/artist.jpg");
  });

  it("defaults primaryArtistImage to null when not in context", () => {
    const track = makeTrack();
    const result = SpotifyTrackMapper.toNormalizedTrack(track);

    expect(result.primaryArtistImage).toBeNull();
  });

  it("prefers context.album over track.album", () => {
    const track = makeTrack();
    const contextAlbum: SpotifyAlbum = {
      name: "Context Album",
      external_urls: { spotify: "https://open.spotify.com/album/ctx" },
      images: [{ url: "https://i.scdn.co/image/ctx.jpg" }],
      release_date: "2023-01-01",
      total_tracks: 5,
      artists: [
        {
          name: "Context Artist",
          external_urls: { spotify: "https://open.spotify.com/artist/ctx" },
        },
      ],
    } as SpotifyAlbum;

    const result = SpotifyTrackMapper.toNormalizedTrack(track, { album: contextAlbum });

    expect(result.album).toBe("Context Album");
    expect(result.albumYear).toBe(2023);
    expect(result.albumArtist).toBe("Context Artist");
  });
});
