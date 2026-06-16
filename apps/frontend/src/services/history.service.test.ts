import { ApiRoutes } from "@spotiarr/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/services/httpClient";
import { historyService } from "./history.service";

vi.mock("@/services/httpClient", () => ({
  httpClient: {
    get: vi.fn(),
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
});
