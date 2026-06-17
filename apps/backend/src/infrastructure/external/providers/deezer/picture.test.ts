import { describe, expect, it } from "vitest";
import { pickBestDeezerArtistPicture } from "./picture";

describe("pickBestDeezerArtistPicture", () => {
  it("returns null when all picture fields are absent", () => {
    const result = pickBestDeezerArtistPicture({ id: 1, name: "Artist" });
    expect(result).toBeNull();
  });

  it("returns null when all picture fields are null/undefined", () => {
    const result = pickBestDeezerArtistPicture({
      id: 1,
      name: "Artist",
      picture: undefined,
      picture_medium: undefined,
      picture_big: undefined,
      picture_xl: undefined,
    });
    expect(result).toBeNull();
  });

  it("prefers picture_xl over all others", () => {
    const result = pickBestDeezerArtistPicture({
      id: 1,
      name: "Artist",
      picture: "https://cdn.deezer.com/images/artist/hash/120x120-abc.jpg",
      picture_medium: "https://cdn.deezer.com/images/artist/hash/250x250-abc.jpg",
      picture_big: "https://cdn.deezer.com/images/artist/hash/500x500-abc.jpg",
      picture_xl: "https://cdn.deezer.com/images/artist/hash/1000x1000-abc.jpg",
    });
    // upscaleDeezerImage on xl URL replaces dimension, result should still be 1000x1000
    expect(result).toContain("1000x1000");
  });

  it("falls back to picture_big when picture_xl is absent", () => {
    const result = pickBestDeezerArtistPicture({
      id: 1,
      name: "Artist",
      picture_big: "https://cdn.deezer.com/images/artist/hash/500x500-abc.jpg",
    });
    expect(result).toContain("1000x1000");
  });

  it("falls back to picture_medium when picture_xl and picture_big are absent", () => {
    const result = pickBestDeezerArtistPicture({
      id: 1,
      name: "Artist",
      picture_medium: "https://cdn.deezer.com/images/artist/hash/250x250-abc.jpg",
    });
    expect(result).toContain("1000x1000");
  });

  it("falls back to picture when only base picture is available", () => {
    const result = pickBestDeezerArtistPicture({
      id: 1,
      name: "Artist",
      picture: "https://cdn.deezer.com/images/artist/hash/120x120-abc.jpg",
    });
    expect(result).toContain("1000x1000");
  });

  it("upscales a CDN URL by replacing the size segment", () => {
    const result = pickBestDeezerArtistPicture({
      id: 1,
      name: "Artist",
      picture_xl: "https://cdn.deezer.com/images/artist/abc123/500x500-000000-80-0-0.jpg",
    });
    expect(result).toBe("https://cdn.deezer.com/images/artist/abc123/1000x1000-000000-80-0-0.jpg");
  });
});
