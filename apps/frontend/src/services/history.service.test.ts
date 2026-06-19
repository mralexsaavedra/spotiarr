import { ApiRoutes } from "@spotiarr/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/services/httpClient";
import { historyService } from "./history.service";

vi.mock("@/services/httpClient", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

afterEach(() => vi.clearAllMocks());

describe("historyService", () => {
  describe("getDownloadHistory", () => {
    it("calls httpClient.get with HISTORY/downloads and returns response.data", async () => {
      const data = [{ id: "p1" }];
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data });

      const result = await historyService.getDownloadHistory();

      expect(httpClient.get).toHaveBeenCalledWith(`${ApiRoutes.HISTORY}/downloads`);
      expect(result).toBe(data);
    });
  });

  describe("getDownloadTracks", () => {
    it("calls httpClient.get with HISTORY/tracks and returns response.data", async () => {
      const data = [{ id: "t1" }];
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data });

      const result = await historyService.getDownloadTracks();

      expect(httpClient.get).toHaveBeenCalledWith(`${ApiRoutes.HISTORY}/tracks`);
      expect(result).toBe(data);
    });
  });

  describe("getTopTracks", () => {
    it("calls httpClient.get with HISTORY/top-tracks?limit=10 and returns response.data", async () => {
      const data = [{ trackName: "Track A", artist: "Artist A", playCount: 5 }];
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data });

      const result = await historyService.getTopTracks(10);

      expect(httpClient.get).toHaveBeenCalledWith(`${ApiRoutes.HISTORY}/top-tracks?limit=10`);
      expect(result).toBe(data);
    });

    it("uses default limit of 10 when no argument passed", async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data: [] });

      await historyService.getTopTracks();

      expect(httpClient.get).toHaveBeenCalledWith(`${ApiRoutes.HISTORY}/top-tracks?limit=10`);
    });
  });

  describe("getTopArtists", () => {
    it("calls httpClient.get with HISTORY/top-artists?limit=10 and returns response.data", async () => {
      const data = [{ artist: "Artist A", playCount: 10 }];
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data });

      const result = await historyService.getTopArtists(10);

      expect(httpClient.get).toHaveBeenCalledWith(`${ApiRoutes.HISTORY}/top-artists?limit=10`);
      expect(result).toBe(data);
    });

    it("uses default limit of 10 when no argument passed", async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data: [] });

      await historyService.getTopArtists();

      expect(httpClient.get).toHaveBeenCalledWith(`${ApiRoutes.HISTORY}/top-artists?limit=10`);
    });
  });

  describe("getRecentPlays", () => {
    it("calls httpClient.get with HISTORY/recent-plays?limit=20 and returns response.data", async () => {
      const data = [{ trackName: "Track A", artist: "Artist A", playedAt: 1700000000000 }];
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data });

      const result = await historyService.getRecentPlays(20);

      expect(httpClient.get).toHaveBeenCalledWith(`${ApiRoutes.HISTORY}/recent-plays?limit=20`);
      expect(result).toBe(data);
    });

    it("uses default limit of 20 when no argument passed", async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data: [] });

      await historyService.getRecentPlays();

      expect(httpClient.get).toHaveBeenCalledWith(`${ApiRoutes.HISTORY}/recent-plays?limit=20`);
    });
  });
});
