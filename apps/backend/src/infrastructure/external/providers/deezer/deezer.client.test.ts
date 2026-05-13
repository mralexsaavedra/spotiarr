import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DeezerClient } from "./deezer.client";

describe("DeezerClient", () => {
  let client: DeezerClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any;

  beforeEach(() => {
    client = new DeezerClient(0); // no delay for tests
    fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe("searchArtist", () => {
    it("returns null when no data", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      const result = await client.searchArtist("Unknown Artist");
      expect(result).toBeNull();
    });

    it("returns null when no exact match", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ id: 1, name: "Different Artist" }],
        }),
      } as Response);

      const result = await client.searchArtist("Target Artist");
      expect(result).toBeNull();
    });

    it("returns first exact match", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { id: 1, name: "Different Artist" },
            { id: 2, name: "Target Artist" },
          ],
        }),
      } as Response);

      const result = await client.searchArtist("Target Artist");
      expect(result).toEqual({ id: 2, name: "Target Artist" });
    });

    it("normalizes names for comparison", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ id: 5, name: "AC/DC" }],
        }),
      } as Response);

      const result = await client.searchArtist("ac dc");
      expect(result).toEqual({ id: 5, name: "AC/DC" });
    });
  });

  describe("getArtistAlbums", () => {
    it("filters albums, singles, and eps", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { id: 1, title: "Album", type: "album" },
            { id: 2, title: "Single", type: "single" },
            { id: 3, title: "EP", type: "ep" },
            { id: 4, title: "Compilation", type: "compilation" },
          ],
        }),
      } as Response);

      const albums = await client.getArtistAlbums(123);
      expect(albums).toHaveLength(3);
      expect(albums.map((a) => a.albumName)).toEqual(["Album", "Single", "EP"]);
    });

    it("returns empty array on network error", async () => {
      fetchSpy.mockRejectedValue(new Error("network failure"));
      const albums = await client.getArtistAlbums(123);
      expect(albums).toEqual([]);
    });
  });
});
