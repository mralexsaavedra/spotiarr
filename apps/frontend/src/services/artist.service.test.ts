import { ApiRoutes } from "@spotiarr/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/services/httpClient";
import { artistService } from "./artist.service";

vi.mock("@/services/httpClient", () => ({
  httpClient: {
    get: vi.fn(),
  },
}));

afterEach(() => vi.clearAllMocks());

describe("artistService", () => {
  describe("getReleases", () => {
    it("calls httpClient.get with FEED/releases and returns the result", async () => {
      const payload = [{ id: "r1" }];
      vi.mocked(httpClient.get).mockResolvedValueOnce(payload);

      const result = await artistService.getReleases();

      expect(httpClient.get).toHaveBeenCalledWith(`${ApiRoutes.FEED}/releases`);
      expect(result).toBe(payload);
    });
  });

  describe("getFollowedArtists", () => {
    it("calls httpClient.get with FEED/artists and returns the result", async () => {
      const payload = [{ id: "a1" }];
      vi.mocked(httpClient.get).mockResolvedValueOnce(payload);

      const result = await artistService.getFollowedArtists();

      expect(httpClient.get).toHaveBeenCalledWith(`${ApiRoutes.FEED}/artists`);
      expect(result).toBe(payload);
    });
  });

  describe("getArtistDetail", () => {
    it("calls httpClient.get with ARTIST/{id}?limit=<default> when limit is omitted", async () => {
      const payload = { id: "a1", name: "Artist" };
      vi.mocked(httpClient.get).mockResolvedValueOnce(payload);

      const result = await artistService.getArtistDetail("a1");

      expect(httpClient.get).toHaveBeenCalledWith(`${ApiRoutes.ARTIST}/a1?limit=12`);
      expect(result).toBe(payload);
    });

    it("calls httpClient.get with ARTIST/{id}?limit=<custom> when limit is provided", async () => {
      const payload = { id: "a1", name: "Artist" };
      vi.mocked(httpClient.get).mockResolvedValueOnce(payload);

      const result = await artistService.getArtistDetail("a1", 5);

      expect(httpClient.get).toHaveBeenCalledWith(`${ApiRoutes.ARTIST}/a1?limit=5`);
      expect(result).toBe(payload);
    });
  });

  describe("getArtistAlbums", () => {
    it("calls httpClient.get with default limit and offset when not provided", async () => {
      const payload = [{ id: "album1" }];
      vi.mocked(httpClient.get).mockResolvedValueOnce(payload);

      const result = await artistService.getArtistAlbums("a1");

      expect(httpClient.get).toHaveBeenCalledWith(
        `${ApiRoutes.ARTIST}/a1/albums?limit=50&offset=0`,
      );
      expect(result).toBe(payload);
    });

    it("calls httpClient.get with custom limit and offset when provided", async () => {
      const payload = [{ id: "album1" }];
      vi.mocked(httpClient.get).mockResolvedValueOnce(payload);

      const result = await artistService.getArtistAlbums("a1", 20, 40);

      expect(httpClient.get).toHaveBeenCalledWith(
        `${ApiRoutes.ARTIST}/a1/albums?limit=20&offset=40`,
      );
      expect(result).toBe(payload);
    });
  });

  describe("getAlbumTracks", () => {
    it("calls httpClient.get with ARTIST/{artistId}/albums/{albumId}/tracks and returns the result", async () => {
      const payload = [{ id: "t1" }];
      vi.mocked(httpClient.get).mockResolvedValueOnce(payload);

      const result = await artistService.getAlbumTracks("a1", "alb1");

      expect(httpClient.get).toHaveBeenCalledWith(`${ApiRoutes.ARTIST}/a1/albums/alb1/tracks`);
      expect(result).toBe(payload);
    });
  });
});
