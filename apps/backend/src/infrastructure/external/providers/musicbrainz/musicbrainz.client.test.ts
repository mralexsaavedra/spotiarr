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

  describe("getReleaseTracks", () => {
    it("maps release-group → release → recordings to NormalizedTrack[]", async () => {
      fetchSpy
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            releases: [
              { id: "release-1", title: "Album One" },
              { id: "release-2", title: "Album One ( Deluxe )" },
            ],
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "release-1",
            title: "Album One",
            media: [
              {
                position: 1,
                tracks: [
                  {
                    position: 1,
                    recording: {
                      id: "rec-1",
                      title: "Track One",
                      length: 200000,
                      "artist-credit": [{ name: "Artist A" }],
                    },
                  },
                  {
                    position: 2,
                    recording: {
                      id: "rec-2",
                      title: "Track Two",
                      length: 250000,
                      "artist-credit": [{ name: "Artist A" }, { name: "Artist B" }],
                    },
                  },
                ],
              },
            ],
          }),
        } as Response);

      const tracks = await client.getReleaseTracks("rg-1");

      expect(tracks).toHaveLength(2);
      expect(tracks[0]).toMatchObject({
        name: "Track One",
        artist: "Artist A",
        album: "Album One",
        trackNumber: 1,
        discNumber: 1,
        durationMs: 200000,
      });
      expect(tracks[1]).toMatchObject({
        name: "Track Two",
        artist: "Artist A, Artist B",
        album: "Album One",
        trackNumber: 2,
        discNumber: 1,
        durationMs: 250000,
      });

      // Verify URLs contain the release/recording IDs
      expect(tracks[0].trackUrl).toContain("recording/rec-1");
      expect(tracks[0].albumUrl).toContain("release/release-1");
    });

    it("returns empty array when release-group has no releases", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ releases: [] }),
      } as Response);

      const tracks = await client.getReleaseTracks("rg-empty");
      expect(tracks).toEqual([]);
    });

    it("returns empty array when release has no media", async () => {
      fetchSpy
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            releases: [{ id: "release-1", title: "Album One" }],
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "release-1", title: "Album One", media: [] }),
        } as Response);

      const tracks = await client.getReleaseTracks("rg-1");
      expect(tracks).toEqual([]);
    });

    it("returns empty array on network error", async () => {
      fetchSpy.mockRejectedValue(new Error("network failure"));
      const tracks = await client.getReleaseTracks("rg-1");
      expect(tracks).toEqual([]);
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
