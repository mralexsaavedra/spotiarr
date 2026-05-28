import { describe, expect, it } from "vitest";
import { mapArtistAlbumRowToRelease, mapArtistReleaseRow } from "./feed-row-mappers";

describe("feed-row-mappers", () => {
  it("maps artist release rows with artist relation", () => {
    const result = mapArtistReleaseRow({
      artistId: "a1",
      albumId: "al1",
      albumName: "Album",
      albumType: "album",
      releaseDate: "2024-01-01",
      coverUrl: "https://e-cdns-images.dzcdn.net/images/cover/abc/250x250-000000-80-0-0.jpg",
      spotifyUrl: "https://spotify/album/1",
      artist: { name: "Artist", imageUrl: "img" },
    });

    expect(result.artistName).toBe("Artist");
    expect(result.coverUrl).toContain("1000x1000");
  });

  it("maps artist album rows with fallback artist metadata", () => {
    const result = mapArtistAlbumRowToRelease(
      {
        spotifyArtistId: "a1",
        albumId: "al1",
        albumName: "Album",
        albumType: "album",
        releaseDate: "2024-01-01",
        coverUrl: null,
        spotifyUrl: null,
        totalTracks: 10,
      },
      { name: "Artist", imageUrl: null },
    );

    expect(result.artistId).toBe("a1");
    expect(result.totalTracks).toBe(10);
  });
});
