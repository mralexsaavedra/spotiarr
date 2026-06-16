import { ApiRoutes } from "@spotiarr/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/services/httpClient";
import {
  fetchLibraryArtist,
  fetchLibraryArtists,
  fetchLibraryStats,
  scanLibrary,
} from "./library.service";

vi.mock("@/services/httpClient", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

afterEach(() => vi.clearAllMocks());

describe("library service", () => {
  describe("fetchLibraryStats", () => {
    it("calls httpClient.get with LIBRARY/stats and returns result.data", async () => {
      const data = { total: 100 };
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data });

      const result = await fetchLibraryStats();

      expect(httpClient.get).toHaveBeenCalledWith(`${ApiRoutes.LIBRARY}/stats`);
      expect(result).toBe(data);
    });
  });

  describe("fetchLibraryArtists", () => {
    it("calls httpClient.get with LIBRARY/artists and returns result.data", async () => {
      const data = [{ name: "Artist A" }];
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data });

      const result = await fetchLibraryArtists();

      expect(httpClient.get).toHaveBeenCalledWith(`${ApiRoutes.LIBRARY}/artists`);
      expect(result).toBe(data);
    });
  });

  describe("fetchLibraryArtist", () => {
    it("encodes the artist name and calls httpClient.get with LIBRARY/artists/{encodedName}", async () => {
      const data = { name: "AC/DC", path: "/music/ac-dc" };
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data });

      const result = await fetchLibraryArtist({ name: "AC/DC", path: "/music/ac-dc" });

      expect(httpClient.get).toHaveBeenCalledWith(
        `${ApiRoutes.LIBRARY}/artists/${encodeURIComponent("AC/DC")}`,
      );
      expect(result).toBe(data);
    });

    it("encodes names with spaces correctly", async () => {
      const data = { name: "The Beatles", path: "/music/the-beatles" };
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data });

      await fetchLibraryArtist({ name: "The Beatles", path: "/music/the-beatles" });

      expect(httpClient.get).toHaveBeenCalledWith(
        `${ApiRoutes.LIBRARY}/artists/${encodeURIComponent("The Beatles")}`,
      );
    });
  });

  describe("scanLibrary", () => {
    it("calls httpClient.post with LIBRARY/scan and returns result.data", async () => {
      const data = { scanned: 42 };
      vi.mocked(httpClient.post).mockResolvedValueOnce({ data });

      const result = await scanLibrary();

      expect(httpClient.post).toHaveBeenCalledWith(`${ApiRoutes.LIBRARY}/scan`);
      expect(result).toBe(data);
    });
  });
});
