import { describe, expect, it, vi } from "vitest";
import { DeezerArtistLookupAdapter } from "./deezer-artist-lookup.adapter";

function makeDeezerClient(overrides: Record<string, unknown> = {}) {
  return {
    searchArtist: vi.fn().mockResolvedValue(null),
    getArtistById: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

const artistWithAllPictures = {
  id: 1,
  name: "Test Artist",
  picture: "https://cdn.deezer.com/images/artist/hash/120x120-abc.jpg",
  picture_medium: "https://cdn.deezer.com/images/artist/hash/250x250-abc.jpg",
  picture_big: "https://cdn.deezer.com/images/artist/hash/500x500-abc.jpg",
  picture_xl: "https://cdn.deezer.com/images/artist/hash/1000x1000-abc.jpg",
};

describe("DeezerArtistLookupAdapter", () => {
  describe("searchArtist", () => {
    it("returns null when client returns null", async () => {
      const adapter = new DeezerArtistLookupAdapter(makeDeezerClient() as never);
      const result = await adapter.searchArtist("Unknown");
      expect(result).toBeNull();
    });

    it("returns DeezerArtistResult with id, name, and picture", async () => {
      const client = makeDeezerClient({
        searchArtist: vi.fn().mockResolvedValue(artistWithAllPictures),
      });
      const adapter = new DeezerArtistLookupAdapter(client as never);

      const result = await adapter.searchArtist("Test Artist");

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.name).toBe("Test Artist");
      expect(result?.picture).toBeTruthy();
    });

    it("returns null when client throws", async () => {
      const client = makeDeezerClient({
        searchArtist: vi.fn().mockRejectedValue(new Error("network error")),
      });
      const adapter = new DeezerArtistLookupAdapter(client as never);

      const result = await adapter.searchArtist("Artist");
      expect(result).toBeNull();
    });

    it("returns null picture when artist has no picture URLs", async () => {
      const client = makeDeezerClient({
        searchArtist: vi.fn().mockResolvedValue({ id: 2, name: "No Pic Artist" }),
      });
      const adapter = new DeezerArtistLookupAdapter(client as never);

      const result = await adapter.searchArtist("No Pic Artist");
      expect(result?.picture).toBeNull();
    });
  });

  describe("getArtistById", () => {
    it("returns null when client returns null", async () => {
      const adapter = new DeezerArtistLookupAdapter(makeDeezerClient() as never);
      const result = await adapter.getArtistById("999");
      expect(result).toBeNull();
    });

    it("returns DeezerArtistResult with id, name, and picture", async () => {
      const client = makeDeezerClient({
        getArtistById: vi.fn().mockResolvedValue(artistWithAllPictures),
      });
      const adapter = new DeezerArtistLookupAdapter(client as never);

      const result = await adapter.getArtistById("1");

      expect(result?.id).toBe(1);
      expect(result?.name).toBe("Test Artist");
      expect(result?.picture).toBeTruthy();
    });

    it("returns null when client throws", async () => {
      const client = makeDeezerClient({
        getArtistById: vi.fn().mockRejectedValue(new Error("boom")),
      });
      const adapter = new DeezerArtistLookupAdapter(client as never);

      const result = await adapter.getArtistById("1");
      expect(result).toBeNull();
    });
  });
});
