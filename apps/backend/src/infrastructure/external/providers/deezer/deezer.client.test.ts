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
      expect(albums.map((a) => a.albumType)).toEqual(["album", "single", "ep"]);
    });

    it("uses record_type before the Deezer resource type", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { id: 1, title: "Album Object Single", type: "album", record_type: "single" },
            { id: 2, title: "Album Object EP", type: "album", record_type: "ep" },
          ],
        }),
      } as Response);

      const albums = await client.getArtistAlbums(123);

      expect(albums.map((a) => a.albumType)).toEqual(["single", "ep"]);
    });

    it("returns empty array on network error", async () => {
      fetchSpy.mockRejectedValue(new Error("network failure"));
      const albums = await client.getArtistAlbums(123);
      expect(albums).toEqual([]);
    });
  });

  describe("searchAlbum", () => {
    it("returns null when no data", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      const result = await client.searchAlbum("Test Artist", "Album Name");
      expect(result).toBeNull();
    });

    it("returns null when no exact match", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ id: 1, title: "Different Album" }],
        }),
      } as Response);

      const result = await client.searchAlbum("Test Artist", "Target Album");
      expect(result).toBeNull();
    });

    it("returns first exact match", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { id: 1, title: "Different Album" },
            { id: 2, title: "Target Album" },
          ],
        }),
      } as Response);

      const result = await client.searchAlbum("Test Artist", "Target Album");
      expect(result).toEqual({ id: 2, title: "Target Album" });
    });

    it("normalizes names for comparison", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ id: 5, title: "The Album" }],
        }),
      } as Response);

      const result = await client.searchAlbum("Test Artist", "the album");
      expect(result).toEqual({ id: 5, title: "The Album" });
    });
  });

  describe("getAlbumTracks", () => {
    it("maps Deezer tracks to NormalizedTrack", async () => {
      fetchSpy
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 12345,
            title: "Test Album",
            cover_xl: "http://cover_xl.jpg",
          }),
        } as Response)
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            data: [
              {
                id: 101,
                title: "Track One",
                duration: 180,
                track_position: 1,
                disk_number: 1,
                artist: { name: "Test Artist" },
                album: { title: "Test Album", cover: "http://cover.jpg" },
              },
              {
                id: 102,
                title: "Track Two",
                duration: 240,
                track_position: 2,
                disk_number: 1,
                artist: { name: "Test Artist" },
                album: { title: "Test Album", cover: "http://cover.jpg" },
              },
            ],
          }),
        } as Response);

      const tracks = await client.getAlbumTracks(12345);
      expect(tracks).toHaveLength(2);
      expect(tracks[0].name).toBe("Track One");
      expect(tracks[0].trackNumber).toBe(1);
      expect(tracks[0].discNumber).toBe(1);
      expect(tracks[0].durationMs).toBe(180000);
      expect(tracks[0].artist).toBe("Test Artist");
      expect(tracks[0].album).toBe("Test Album");
      expect(tracks[0].albumCoverUrl).toBe("http://cover.jpg");
    });

    it("returns empty array on network error", async () => {
      fetchSpy.mockRejectedValue(new Error("network failure"));
      const tracks = await client.getAlbumTracks(12345);
      expect(tracks).toEqual([]);
    });

    it("follows pagination", async () => {
      fetchSpy
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 123, title: "Album", cover_xl: "http://cover.jpg" }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: 1,
                title: "Page 1",
                duration: 60,
                track_position: 1,
                disk_number: 1,
                artist: { name: "A" },
              },
            ],
            next: "https://api.deezer.com/album/123/tracks?index=1",
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: 2,
                title: "Page 2",
                duration: 60,
                track_position: 2,
                disk_number: 1,
                artist: { name: "A" },
              },
            ],
            next: null,
          }),
        } as Response);

      const tracks = await client.getAlbumTracks(123);
      expect(tracks).toHaveLength(2);
      expect(tracks[1].name).toBe("Page 2");
    });
  });

  describe("searchTrack", () => {
    it("returns list of track results with expected fields", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 999,
              title: "Test Track",
              duration: 210,
              track_position: 1,
              disk_number: 1,
              artist: { id: 11, name: "Test Artist" },
              album: { id: 22, title: "Test Album" },
            },
          ],
        }),
      } as Response);

      const results = await client.searchTrack("Test Track");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(999);
      expect(results[0].title).toBe("Test Track");
      expect(results[0].artist.name).toBe("Test Artist");
    });

    it("returns empty array when Deezer returns no results", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      const results = await client.searchTrack("nonexistent track");
      expect(results).toEqual([]);
    });

    it("returns empty array on API error (non-OK response)", async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const results = await client.searchTrack("track");
      expect(results).toEqual([]);
    });

    it("returns empty array on network error", async () => {
      fetchSpy.mockRejectedValue(new Error("network failure"));

      const results = await client.searchTrack("track");
      expect(results).toEqual([]);
    });

    it("calls the correct Deezer search/track endpoint", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      await client.searchTrack("my query");
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/search/track?q="));
    });
  });
});
