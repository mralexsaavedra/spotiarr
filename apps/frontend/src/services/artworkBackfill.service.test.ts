import { ApiRoutes } from "@spotiarr/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/services/httpClient";
import { fetchArtworkBackfillStatus, startArtworkBackfill } from "./artworkBackfill.service";

vi.mock("@/services/httpClient", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

afterEach(() => vi.clearAllMocks());

describe("artworkBackfill service", () => {
  describe("fetchArtworkBackfillStatus", () => {
    it("calls httpClient.get with LIBRARY/artwork-backfill/status and returns result.data", async () => {
      const data = { total: 10, processed: 5 };
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data });

      const result = await fetchArtworkBackfillStatus();

      expect(httpClient.get).toHaveBeenCalledWith(`${ApiRoutes.LIBRARY}/artwork-backfill/status`);
      expect(result).toBe(data);
    });
  });

  describe("startArtworkBackfill", () => {
    it("calls httpClient.post with LIBRARY/artwork-backfill/start and returns result.data", async () => {
      const data = { jobId: "job-1" };
      vi.mocked(httpClient.post).mockResolvedValueOnce({ data });

      const result = await startArtworkBackfill();

      expect(httpClient.post).toHaveBeenCalledWith(`${ApiRoutes.LIBRARY}/artwork-backfill/start`);
      expect(result).toBe(data);
    });
  });
});
