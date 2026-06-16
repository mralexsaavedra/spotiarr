import { ApiRoutes } from "@spotiarr/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/services/httpClient";
import { SearchService } from "./search.service";

vi.mock("@/services/httpClient", () => ({
  httpClient: {
    get: vi.fn(),
  },
}));

afterEach(() => vi.clearAllMocks());

describe("SearchService", () => {
  describe("searchCatalog", () => {
    it("builds URL with encoded query and default limit when types is omitted", async () => {
      const data = { artists: [] };
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data });

      const result = await SearchService.searchCatalog("hello world");

      expect(httpClient.get).toHaveBeenCalledWith(
        `${ApiRoutes.SEARCH}?q=${encodeURIComponent("hello world")}&limit=10`,
      );
      expect(result).toBe(data);
    });

    it("builds URL with custom limit when provided", async () => {
      const data = { artists: [] };
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data });

      await SearchService.searchCatalog("test", undefined, 5);

      expect(httpClient.get).toHaveBeenCalledWith(
        `${ApiRoutes.SEARCH}?q=${encodeURIComponent("test")}&limit=5`,
      );
    });

    it("appends types param as comma-separated list when types is provided", async () => {
      const data = { artists: [], tracks: [] };
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data });

      await SearchService.searchCatalog("test", ["artist", "track"]);

      const callArg = vi.mocked(httpClient.get).mock.calls[0][0] as string;
      // The service builds types via Array.join(",") — not URLSearchParams — so commas are literal
      expect(callArg).toContain("types=artist,track");
    });

    it("does not append types param when types array is empty", async () => {
      const data = {};
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data });

      await SearchService.searchCatalog("test", []);

      const callArg = vi.mocked(httpClient.get).mock.calls[0][0] as string;
      expect(callArg).not.toContain("types=");
    });

    it("encodes special characters in query", async () => {
      const data = {};
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data });

      await SearchService.searchCatalog("AC/DC & more");

      const callArg = vi.mocked(httpClient.get).mock.calls[0][0] as string;
      expect(callArg).toContain(`q=${encodeURIComponent("AC/DC & more")}`);
    });
  });
});
