import { ApiRoutes } from "@spotiarr/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/services/httpClient";
import { externalUrlService } from "./external-url.service";

vi.mock("@/services/httpClient", () => ({
  httpClient: {
    get: vi.fn(),
  },
}));

afterEach(() => vi.clearAllMocks());

describe("externalUrlService", () => {
  describe("resolve", () => {
    it("builds the query with required params only when name and artistName are omitted", async () => {
      const payload = { url: "https://example.com" };
      vi.mocked(httpClient.get).mockResolvedValueOnce(payload);

      const result = await externalUrlService.resolve({
        provider: "spotify",
        type: "artist",
        id: "abc123",
      });

      expect(httpClient.get).toHaveBeenCalledWith(
        `${ApiRoutes.EXTERNAL_URL}?provider=spotify&type=artist&id=abc123`,
      );
      expect(result).toBe(payload);
    });

    it("appends name to query when provided", async () => {
      const payload = { url: "https://example.com" };
      vi.mocked(httpClient.get).mockResolvedValueOnce(payload);

      await externalUrlService.resolve({
        provider: "deezer",
        type: "track",
        id: "t1",
        name: "My Track",
      });

      const callArg = vi.mocked(httpClient.get).mock.calls[0][0] as string;
      expect(callArg).toContain("name=My+Track");
      expect(callArg).toContain("provider=deezer");
      expect(callArg).not.toContain("artist=");
    });

    it("appends artist to query when artistName is provided", async () => {
      const payload = { url: "https://example.com" };
      vi.mocked(httpClient.get).mockResolvedValueOnce(payload);

      await externalUrlService.resolve({
        provider: "spotify",
        type: "album",
        id: "alb1",
        artistName: "Some Artist",
      });

      const callArg = vi.mocked(httpClient.get).mock.calls[0][0] as string;
      expect(callArg).toContain("artist=Some+Artist");
      expect(callArg).not.toContain("name=");
    });

    it("appends both name and artist when both are provided", async () => {
      const payload = { url: "https://example.com" };
      vi.mocked(httpClient.get).mockResolvedValueOnce(payload);

      await externalUrlService.resolve({
        provider: "deezer",
        type: "track",
        id: "t2",
        name: "Track Name",
        artistName: "Artist Name",
      });

      const callArg = vi.mocked(httpClient.get).mock.calls[0][0] as string;
      expect(callArg).toContain("name=Track+Name");
      expect(callArg).toContain("artist=Artist+Name");
    });
  });
});
