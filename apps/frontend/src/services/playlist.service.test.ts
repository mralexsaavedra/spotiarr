import { ApiRoutes } from "@spotiarr/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, httpClient } from "@/services/httpClient";
import { playlistService } from "./playlist.service";

vi.mock("@/services/httpClient", () => ({
  ApiError: class ApiError extends Error {
    code?: string;
    status?: number;
    constructor(message: string, code?: string, status?: number) {
      super(message);
      this.name = "ApiError";
      this.code = code;
      this.status = status;
    }
  },
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

afterEach(() => vi.clearAllMocks());

describe("playlistService", () => {
  describe("getPlaylists", () => {
    it("calls httpClient.get with PLAYLIST and returns response.data", async () => {
      const data = [{ id: "p1" }];
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data });

      const result = await playlistService.getPlaylists();

      expect(httpClient.get).toHaveBeenCalledWith(ApiRoutes.PLAYLIST);
      expect(result).toBe(data);
    });
  });

  describe("getMyPlaylists", () => {
    it("calls httpClient.get with PLAYLIST/me and returns the result", async () => {
      const payload = [{ id: "sp1" }];
      vi.mocked(httpClient.get).mockResolvedValueOnce(payload);

      const result = await playlistService.getMyPlaylists();

      expect(httpClient.get).toHaveBeenCalledWith(`${ApiRoutes.PLAYLIST}/me`);
      expect(result).toBe(payload);
    });
  });

  describe("getDownloadStatus", () => {
    it("calls httpClient.get with PLAYLIST/status and returns the result", async () => {
      const payload = { status: "idle" };
      vi.mocked(httpClient.get).mockResolvedValueOnce(payload);

      const result = await playlistService.getDownloadStatus();

      expect(httpClient.get).toHaveBeenCalledWith(`${ApiRoutes.PLAYLIST}/status`);
      expect(result).toBe(payload);
    });
  });

  describe("getPlaylistPreview", () => {
    it("calls httpClient.get with PLAYLIST/preview?url=<encoded> and returns the result", async () => {
      const payload = { name: "My Playlist" };
      vi.mocked(httpClient.get).mockResolvedValueOnce(payload);

      const spotifyUrl = "https://open.spotify.com/playlist/abc";
      const result = await playlistService.getPlaylistPreview(spotifyUrl);

      const expectedParams = new URLSearchParams({ url: spotifyUrl });
      expect(httpClient.get).toHaveBeenCalledWith(
        `${ApiRoutes.PLAYLIST}/preview?${expectedParams.toString()}`,
      );
      expect(result).toBe(payload);
    });
  });

  describe("getPlaylistPreviewTracksPage", () => {
    it("calls httpClient.get with PLAYLIST/preview/tracks?url=...&offset=...&limit=... and returns the result", async () => {
      const payload = { tracks: [], total: 0 };
      vi.mocked(httpClient.get).mockResolvedValueOnce(payload);

      const spotifyUrl = "https://open.spotify.com/playlist/abc";
      const result = await playlistService.getPlaylistPreviewTracksPage(spotifyUrl, 20, 10);

      const expectedParams = new URLSearchParams({
        url: spotifyUrl,
        offset: "20",
        limit: "10",
      });
      expect(httpClient.get).toHaveBeenCalledWith(
        `${ApiRoutes.PLAYLIST}/preview/tracks?${expectedParams.toString()}`,
      );
      expect(result).toBe(payload);
    });
  });

  describe("createPlaylist", () => {
    it("calls httpClient.post with PLAYLIST and input, then returns the result", async () => {
      const input = {
        kind: "spotifyUrl" as const,
        spotifyUrl: "https://open.spotify.com/playlist/abc",
      };
      const payload = { id: "p1", ...input };
      vi.mocked(httpClient.post).mockResolvedValueOnce(payload);

      const result = await playlistService.createPlaylist(input);

      expect(httpClient.post).toHaveBeenCalledWith(ApiRoutes.PLAYLIST, input);
      expect(result).toBe(payload);
    });

    it("re-throws ApiError with invalid_playlist_payload code when httpClient throws that error", async () => {
      const original = new ApiError("some message", "invalid_playlist_payload", 422);
      vi.mocked(httpClient.post).mockRejectedValueOnce(original);

      await expect(
        playlistService.createPlaylist({
          kind: "spotifyUrl",
          spotifyUrl: "https://open.spotify.com/playlist/abc",
        }),
      ).rejects.toMatchObject({ code: "invalid_playlist_payload" });
    });

    it("re-throws other errors without remapping", async () => {
      const other = new Error("network failure");
      vi.mocked(httpClient.post).mockRejectedValueOnce(other);

      await expect(
        playlistService.createPlaylist({
          kind: "spotifyUrl",
          spotifyUrl: "https://open.spotify.com/playlist/abc",
        }),
      ).rejects.toBe(other);
    });
  });

  describe("updatePlaylist", () => {
    it("calls httpClient.put with PLAYLIST/{id} and data", async () => {
      vi.mocked(httpClient.put).mockResolvedValueOnce(undefined);

      await playlistService.updatePlaylist("p1", { name: "Updated" });

      expect(httpClient.put).toHaveBeenCalledWith(`${ApiRoutes.PLAYLIST}/p1`, { name: "Updated" });
    });

    it("re-throws ApiError with invalid_playlist_payload code when httpClient throws that error", async () => {
      const original = new ApiError("some message", "invalid_playlist_payload", 422);
      vi.mocked(httpClient.put).mockRejectedValueOnce(original);

      await expect(playlistService.updatePlaylist("p1", { name: "Bad" })).rejects.toMatchObject({
        code: "invalid_playlist_payload",
      });
    });

    it("re-throws other errors without remapping", async () => {
      const other = new Error("network failure");
      vi.mocked(httpClient.put).mockRejectedValueOnce(other);

      await expect(playlistService.updatePlaylist("p1", { name: "Bad" })).rejects.toBe(other);
    });
  });

  describe("retryFailedTracks", () => {
    it("calls httpClient.post with PLAYLIST/{id}/retry and returns the result", async () => {
      vi.mocked(httpClient.post).mockResolvedValueOnce(undefined);

      await playlistService.retryFailedTracks("p1");

      expect(httpClient.post).toHaveBeenCalledWith(`${ApiRoutes.PLAYLIST}/p1/retry`);
    });
  });

  describe("deletePlaylist", () => {
    it("calls httpClient.delete with PLAYLIST/{id} and returns the result", async () => {
      vi.mocked(httpClient.delete).mockResolvedValueOnce(undefined);

      await playlistService.deletePlaylist("p1");

      expect(httpClient.delete).toHaveBeenCalledWith(`${ApiRoutes.PLAYLIST}/p1`);
    });
  });
});
