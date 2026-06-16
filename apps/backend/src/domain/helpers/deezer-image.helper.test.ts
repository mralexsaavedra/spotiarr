import { describe, expect, it } from "vitest";
import { upscaleDeezerImage } from "./deezer-image.helper";

describe("upscaleDeezerImage", () => {
  it("returns null for null", () => {
    expect(upscaleDeezerImage(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(upscaleDeezerImage(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(upscaleDeezerImage("")).toBeNull();
  });

  it("replaces a plain size segment like /250x250.jpg with /1000x1000.jpg", () => {
    const url = "https://e-cdns-images.dzcdn.net/images/cover/abc123/250x250.jpg";
    expect(upscaleDeezerImage(url)).toBe(
      "https://e-cdns-images.dzcdn.net/images/cover/abc123/1000x1000.jpg",
    );
  });

  it("replaces a size segment with modifier like /250x250-000000.jpg with /1000x1000-000000.jpg", () => {
    const url = "https://e-cdns-images.dzcdn.net/images/cover/abc123/250x250-000000.jpg";
    expect(upscaleDeezerImage(url)).toBe(
      "https://e-cdns-images.dzcdn.net/images/cover/abc123/1000x1000-000000.jpg",
    );
  });

  it("returns the original string when no size pattern matches", () => {
    const url = "https://example.com/image.png";
    expect(upscaleDeezerImage(url)).toBe("https://example.com/image.png");
  });

  it("handles a full realistic Deezer URL", () => {
    const url = "https://e-cdns-images.dzcdn.net/images/cover/deadbeef1234/500x500.jpg";
    expect(upscaleDeezerImage(url)).toBe(
      "https://e-cdns-images.dzcdn.net/images/cover/deadbeef1234/1000x1000.jpg",
    );
  });
});
