import { describe, expect, it } from "vitest";
import { pickBestCover, upgradeDeezerCoverUrl } from "./cover-url";

describe("pickBestCover", () => {
  it("returns undefined when all fields are absent", () => {
    expect(pickBestCover({})).toBeUndefined();
  });

  it("prefers cover_xl over everything else", () => {
    expect(
      pickBestCover({
        cover_xl: "https://cdn.dz/xl.jpg",
        cover_big: "https://cdn.dz/big.jpg",
        cover_medium: "https://cdn.dz/medium.jpg",
        cover: "https://cdn.dz/cover.jpg",
      }),
    ).toBe("https://cdn.dz/xl.jpg");
  });

  it("falls back to cover_big when cover_xl is absent", () => {
    expect(
      pickBestCover({
        cover_big: "https://cdn.dz/big.jpg",
        cover_medium: "https://cdn.dz/medium.jpg",
        cover: "https://cdn.dz/cover.jpg",
      }),
    ).toBe("https://cdn.dz/big.jpg");
  });

  it("falls back to cover_medium when cover_xl and cover_big are absent", () => {
    expect(
      pickBestCover({
        cover_medium: "https://cdn.dz/medium.jpg",
        cover: "https://cdn.dz/cover.jpg",
      }),
    ).toBe("https://cdn.dz/medium.jpg");
  });

  it("falls back to cover when only base cover is present", () => {
    expect(pickBestCover({ cover: "https://cdn.dz/cover.jpg" })).toBe("https://cdn.dz/cover.jpg");
  });

  it("treats empty string as falsy and skips to next field", () => {
    expect(
      pickBestCover({
        cover_xl: "",
        cover_big: "https://cdn.dz/big.jpg",
      }),
    ).toBe("https://cdn.dz/big.jpg");
  });
});

describe("upgradeDeezerCoverUrl", () => {
  it("returns null for null input", () => {
    expect(upgradeDeezerCoverUrl(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(upgradeDeezerCoverUrl(undefined)).toBeNull();
  });

  it("appends size=xl for api.deezer.com album image URLs", () => {
    const url = "https://api.deezer.com/album/12345/image";
    const result = upgradeDeezerCoverUrl(url);
    expect(result).toContain("size=xl");
  });

  it("preserves existing query params and adds size=xl for api.deezer.com URLs", () => {
    const url = "https://api.deezer.com/album/12345/image?foo=bar";
    const result = upgradeDeezerCoverUrl(url);
    expect(result).toContain("foo=bar");
    expect(result).toContain("size=xl");
  });

  it("replaces the size segment in CDN URLs", () => {
    const url = "https://cdns-images.dzcdn.net/images/cover/abc123/250x250-none.jpg";
    const result = upgradeDeezerCoverUrl(url);
    expect(result).toBe("https://cdns-images.dzcdn.net/images/cover/abc123/1000x1000-none.jpg");
  });

  it("returns the URL unchanged for non-Deezer URLs", () => {
    const url = "https://example.com/image.jpg";
    expect(upgradeDeezerCoverUrl(url)).toBe(url);
  });

  it("handles CDN URLs with different size segments correctly", () => {
    const url = "https://cdns-images.dzcdn.net/images/cover/hash/120x120-000000.jpg";
    const result = upgradeDeezerCoverUrl(url);
    expect(result).toBe("https://cdns-images.dzcdn.net/images/cover/hash/1000x1000-000000.jpg");
  });
});
