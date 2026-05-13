import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MusicBrainzClient } from "./musicbrainz.client";

describe("MusicBrainzClient", () => {
  let client: MusicBrainzClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any;

  beforeEach(() => {
    client = new MusicBrainzClient();
    fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe("searchArtist", () => {
    it("returns null when no artists", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ artists: [] }),
      } as Response);

      const result = await client.searchArtist("Unknown");
      expect(result).toBeNull();
    });

    it("returns null when no exact match", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          artists: [{ id: "mb-1", name: "Different" }],
        }),
      } as Response);

      const result = await client.searchArtist("Target");
      expect(result).toBeNull();
    });

    it("returns first exact match", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          artists: [
            { id: "mb-1", name: "Different" },
            { id: "mb-2", name: "Target" },
          ],
        }),
      } as Response);

      const result = await client.searchArtist("Target");
      expect(result).toEqual({ id: "mb-2", name: "Target" });
    });

    it("sends required User-Agent header", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ artists: [{ id: "mb-1", name: "Artist" }] }),
      } as Response);

      await client.searchArtist("Artist");

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("musicbrainz.org"),
        expect.objectContaining({
          headers: expect.objectContaining({
            "User-Agent": expect.stringContaining("Spotiarr"),
          }),
        }),
      );
    });
  });

  describe("getArtistReleaseGroups", () => {
    it("maps release groups to ArtistRelease", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          "release-groups": [
            {
              id: "rg-1",
              title: "Album One",
              "primary-type": "Album",
              "first-release-date": "2023-01-01",
            },
            {
              id: "rg-2",
              title: "Single One",
              "primary-type": "Single",
              "first-release-date": "2023-06-01",
            },
          ],
        }),
      } as Response);

      const releases = await client.getArtistReleaseGroups("mb-artist-1");
      expect(releases).toHaveLength(2);
      expect(releases[0].albumName).toBe("Album One");
      expect(releases[0].albumType).toBe("album");
      expect(releases[1].albumType).toBe("single");
    });

    it("returns empty array on network error", async () => {
      fetchSpy.mockRejectedValue(new Error("network failure"));
      const releases = await client.getArtistReleaseGroups("mb-artist-1");
      expect(releases).toEqual([]);
    });
  });
});
