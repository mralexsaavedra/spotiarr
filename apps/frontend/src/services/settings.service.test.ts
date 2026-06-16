import { ApiRoutes } from "@spotiarr/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/services/httpClient";
import { settingsService } from "./settings.service";

vi.mock("@/services/httpClient", () => ({
  httpClient: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

afterEach(() => vi.clearAllMocks());

describe("settingsService", () => {
  describe("getSettings", () => {
    it("calls httpClient.get with SETTINGS and returns response.data", async () => {
      const data = [{ key: "theme", value: "dark" }];
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data });

      const result = await settingsService.getSettings();

      expect(httpClient.get).toHaveBeenCalledWith(ApiRoutes.SETTINGS);
      expect(result).toBe(data);
    });
  });

  describe("updateSettings", () => {
    it("calls httpClient.put with SETTINGS and wrapped settings array", async () => {
      vi.mocked(httpClient.put).mockResolvedValueOnce(undefined);

      const settings = [{ key: "theme", value: "light" }];
      await settingsService.updateSettings(settings);

      expect(httpClient.put).toHaveBeenCalledWith(ApiRoutes.SETTINGS, { settings });
    });
  });

  describe("getSupportedFormats", () => {
    it("calls httpClient.get with SETTINGS/formats and returns response.data", async () => {
      const data = [{ format: "mp3" }];
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data });

      const result = await settingsService.getSupportedFormats();

      expect(httpClient.get).toHaveBeenCalledWith(`${ApiRoutes.SETTINGS}/formats`);
      expect(result).toBe(data);
    });
  });

  describe("getSettingsMetadata", () => {
    it("calls httpClient.get with SETTINGS/metadata and returns response.data", async () => {
      const data = { theme: { label: "Theme", type: "select" } };
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data });

      const result = await settingsService.getSettingsMetadata();

      expect(httpClient.get).toHaveBeenCalledWith(`${ApiRoutes.SETTINGS}/metadata`);
      expect(result).toBe(data);
    });
  });
});
