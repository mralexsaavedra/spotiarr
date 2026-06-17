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

  describe("searchArtistList", () => {
    it("returns up to limit entries", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { id: 1, name: "Artist One" },
            { id: 2, name: "Artist Two" },
            { id: 3, name: "Artist Three" },
          ],
        }),
      } as Response);

      const results = await client.searchArtistList("artist", 2);
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe(1);
      expect(results[1].id).toBe(2);
    });

    it("returns [] when API returns null data", async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const results = await client.searchArtistList("artist", 5);
      expect(results).toEqual([]);
    });

    it("includes the limit parameter in the request URL", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      await client.searchArtistList("query", 10);
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("limit=10"));
    });
  });

  describe("searchAlbumList", () => {
    it("returns up to limit entries", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { id: 1, title: "Album One" },
            { id: 2, title: "Album Two" },
            { id: 3, title: "Album Three" },
          ],
        }),
      } as Response);

      const results = await client.searchAlbumList("album", 2);
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe(1);
      expect(results[1].id).toBe(2);
    });

    it("returns [] when API returns null data", async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const results = await client.searchAlbumList("album", 5);
      expect(results).toEqual([]);
    });

    it("includes the limit parameter in the request URL", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      await client.searchAlbumList("query", 7);
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("limit=7"));
    });
  });

  describe("getArtistById", () => {
    it("returns the artist when the response has an id field", async () => {
      const artist = { id: 42, name: "Test Artist", picture: "http://pic.jpg" };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => artist,
      } as Response);

      const result = await client.getArtistById(42);
      expect(result).toEqual(artist);
    });

    it("returns null when the response has no id field", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);

      const result = await client.getArtistById(42);
      expect(result).toBeNull();
    });

    it("returns null when fetchJson returns null (non-OK response)", async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const result = await client.getArtistById(99999);
      expect(result).toBeNull();
    });

    it("calls the correct endpoint", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 123, name: "Artist" }),
      } as Response);

      await client.getArtistById(123);
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/artist/123"));
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

    it("follows pagination to fetch all pages", async () => {
      fetchSpy
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ id: 1, title: "First Album", type: "album" }],
            next: "https://api.deezer.com/artist/123/albums?index=1",
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ id: 2, title: "Second Album", type: "album" }],
            next: null,
          }),
        } as Response);

      const albums = await client.getArtistAlbums(123);
      expect(albums).toHaveLength(2);
      expect(albums[0].albumName).toBe("First Album");
      expect(albums[1].albumName).toBe("Second Album");
    });

    it("breaks out of pagination loop when result.data is missing", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ next: "https://api.deezer.com/artist/123/albums?index=1" }),
      } as Response);

      const albums = await client.getArtistAlbums(123);
      expect(albums).toEqual([]);
      // Should only call fetch once, not loop indefinitely
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("filters out entries with no recognized type", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { id: 1, title: "Podcast", type: "podcast" },
            { id: 2, title: "Live", record_type: "live" },
            { id: 3, title: "Valid Album", type: "album" },
          ],
        }),
      } as Response);

      const albums = await client.getArtistAlbums(123);
      expect(albums).toHaveLength(1);
      expect(albums[0].albumName).toBe("Valid Album");
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

    it("falls back to albumTitle from albumMeta when track has no album field", async () => {
      fetchSpy
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 777,
            title: "Meta Album Title",
            cover_xl: "http://meta_cover.jpg",
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: 10,
                title: "Track Without Album",
                duration: 120,
                track_position: 1,
                disk_number: 1,
                artist: { name: "Solo Artist" },
                // no album field
              },
            ],
          }),
        } as Response);

      const tracks = await client.getAlbumTracks(777);
      expect(tracks).toHaveLength(1);
      expect(tracks[0].album).toBe("Meta Album Title");
      expect(tracks[0].albumCoverUrl).toBe("http://meta_cover.jpg");
    });

    it("uses empty albumTitle and undefined albumCover when albumMeta fetch fails", async () => {
      fetchSpy
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: 20,
                title: "Orphan Track",
                duration: 90,
                track_position: 1,
                disk_number: 1,
                artist: { name: "Artist" },
                // no album field — will fall back to albumTitle
              },
            ],
          }),
        } as Response);

      const tracks = await client.getAlbumTracks(888);
      expect(tracks).toHaveLength(1);
      expect(tracks[0].album).toBe("");
      expect(tracks[0].albumCoverUrl).toBeUndefined();
    });
  });

  describe("getArtistTopTracks", () => {
    it("calls /artist/{id}/top?limit=N and returns parsed tracks", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 55,
              title: "Hit Song",
              duration: 200,
              track_position: 1,
              disk_number: 1,
              artist: { id: 7, name: "Big Artist" },
              album: { id: 9, title: "Big Album", cover_medium: "http://cover.jpg" },
            },
          ],
        }),
      } as Response);

      const tracks = await client.getArtistTopTracks(7, 5);

      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/artist/7/top?limit=5"));
      expect(tracks).toHaveLength(1);
      expect(tracks[0].id).toBe(55);
      expect(tracks[0].title).toBe("Hit Song");
      expect(tracks[0].duration).toBe(200);
    });

    it("returns empty array when API returns no data", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      const tracks = await client.getArtistTopTracks(7, 5);
      expect(tracks).toEqual([]);
    });

    it("returns empty array on network error", async () => {
      fetchSpy.mockRejectedValue(new Error("network failure"));
      const tracks = await client.getArtistTopTracks(7, 5);
      expect(tracks).toEqual([]);
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
