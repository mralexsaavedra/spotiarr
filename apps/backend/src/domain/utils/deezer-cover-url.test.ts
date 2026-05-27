import { describe, expect, it } from "vitest";
import { upgradeDeezerCoverUrl } from "./deezer-cover-url";

describe("upgradeDeezerCoverUrl", () => {
  it("upgrades api.deezer.com album image urls to xl size", () => {
    const url = "https://api.deezer.com/album/302127/image";
    expect(upgradeDeezerCoverUrl(url)).toBe("https://api.deezer.com/album/302127/image?size=xl");
  });

  it("upgrades deezer CDN size segment to 1000x1000", () => {
    const url = "https://cdns-images.dzcdn.net/images/cover/hash/250x250-000000-80-0-0.jpg";
    expect(upgradeDeezerCoverUrl(url)).toContain("/1000x1000-");
  });

  it("leaves non-deezer urls unchanged", () => {
    const url = "https://example.com/cover.jpg";
    expect(upgradeDeezerCoverUrl(url)).toBe(url);
  });
});
