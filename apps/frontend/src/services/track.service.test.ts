import { ApiRoutes } from "@spotiarr/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/services/httpClient";
import { trackService } from "./track.service";

vi.mock("@/services/httpClient", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

afterEach(() => vi.clearAllMocks());

describe("trackService", () => {
  describe("getTracksByPlaylist", () => {
    it("calls httpClient.get with TRACK/playlist/{playlistId} and returns response.data", async () => {
      const data = [{ id: "t1" }];
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data });

      const result = await trackService.getTracksByPlaylist("p1");

      expect(httpClient.get).toHaveBeenCalledWith(`${ApiRoutes.TRACK}/playlist/p1`);
      expect(result).toBe(data);
    });
  });

  describe("retryTrack", () => {
    it("calls httpClient.post with TRACK/{id}/retry and returns the result", async () => {
      vi.mocked(httpClient.post).mockResolvedValueOnce(undefined);

      await trackService.retryTrack("t1");

      expect(httpClient.post).toHaveBeenCalledWith(`${ApiRoutes.TRACK}/t1/retry`);
    });
  });

  describe("deleteTrack", () => {
    it("calls httpClient.delete with TRACK/{id} and returns the result", async () => {
      vi.mocked(httpClient.delete).mockResolvedValueOnce(undefined);

      await trackService.deleteTrack("t1");

      expect(httpClient.delete).toHaveBeenCalledWith(`${ApiRoutes.TRACK}/t1`);
    });
  });
});
