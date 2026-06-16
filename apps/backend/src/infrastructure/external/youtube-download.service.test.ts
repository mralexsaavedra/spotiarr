import { describe, expect, it, vi } from "vitest";
import { YoutubeDownloadService } from "./youtube-download.service";

// Mock ytdlp-nodejs so no real binary is invoked
const mockDownloadAsync = vi.fn();
const mockGetInfoAsync = vi.fn();

vi.mock("ytdlp-nodejs", () => ({
  YtDlp: vi.fn().mockImplementation(() => ({
    downloadAsync: mockDownloadAsync,
    getInfoAsync: mockGetInfoAsync,
  })),
}));

vi.mock("./youtube.constants", () => ({
  YOUTUBE_HEADERS: { "User-Agent": "test-agent" },
}));

function makeSettings(overrides: Record<string, string | number> = {}) {
  return {
    getString: vi.fn().mockImplementation((key: string) => Promise.resolve(overrides[key] ?? "")),
    getNumber: vi.fn().mockImplementation((key: string) => Promise.resolve(overrides[key] ?? 0)),
  };
}

function makeSearchService(path = "/usr/bin/yt-dlp") {
  return {
    getYtDlpPath: vi.fn().mockReturnValue(path),
  };
}

function makeTrack(overrides: Record<string, unknown> = {}) {
  return {
    artist: "Test Artist",
    name: "Test Track",
    youtubeUrl: "https://youtu.be/abc123",
    ...overrides,
  };
}

describe("YoutubeDownloadService", () => {
  describe("downloadAndFormat", () => {
    it("throws a 400 AppError when youtubeUrl is missing", async () => {
      const service = new YoutubeDownloadService(
        makeSettings() as never,
        makeSearchService() as never,
      );

      await expect(
        service.downloadAndFormat(makeTrack({ youtubeUrl: undefined }) as never, "/output/path"),
      ).rejects.toMatchObject({ statusCode: 400, errorCode: "internal_server_error" });
    });

    it("calls downloadAsync with the track url and output path", async () => {
      mockDownloadAsync.mockResolvedValue(undefined);
      mockGetInfoAsync.mockResolvedValue({ duration: 180 });

      const service = new YoutubeDownloadService(
        makeSettings() as never,
        makeSearchService() as never,
      );

      const result = await service.downloadAndFormat(makeTrack() as never, "/music/track.mp3");

      expect(mockDownloadAsync).toHaveBeenCalledWith(
        "https://youtu.be/abc123",
        expect.objectContaining({ output: "/music/track.mp3" }),
      );
      expect(result.durationMs).toBe(180_000);
    });

    it("uses the configured audio format when valid", async () => {
      mockDownloadAsync.mockResolvedValue(undefined);
      mockGetInfoAsync.mockResolvedValue({ duration: 60 });

      const service = new YoutubeDownloadService(
        makeSettings({ FORMAT: "flac" }) as never,
        makeSearchService() as never,
      );

      await service.downloadAndFormat(makeTrack() as never, "/out.flac");

      expect(mockDownloadAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ format: expect.objectContaining({ type: "flac" }) }),
      );
    });

    it("falls back to the default format for an invalid format setting", async () => {
      mockDownloadAsync.mockResolvedValue(undefined);
      mockGetInfoAsync.mockResolvedValue({});

      const service = new YoutubeDownloadService(
        makeSettings({ FORMAT: "wav_invalid" }) as never,
        makeSearchService() as never,
      );

      await service.downloadAndFormat(makeTrack() as never, "/out");

      expect(mockDownloadAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          format: expect.objectContaining({ filter: "audioonly" }),
        }),
      );
    });

    it("maps quality setting 'good' to 5", async () => {
      mockDownloadAsync.mockResolvedValue(undefined);
      mockGetInfoAsync.mockResolvedValue({});

      const service = new YoutubeDownloadService(
        makeSettings({ YT_AUDIO_QUALITY: "good" }) as never,
        makeSearchService() as never,
      );

      await service.downloadAndFormat(makeTrack() as never, "/out");

      expect(mockDownloadAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ format: expect.objectContaining({ quality: 5 }) }),
      );
    });

    it("maps quality setting 'acceptable' to 9", async () => {
      mockDownloadAsync.mockResolvedValue(undefined);
      mockGetInfoAsync.mockResolvedValue({});

      const service = new YoutubeDownloadService(
        makeSettings({ YT_AUDIO_QUALITY: "acceptable" }) as never,
        makeSearchService() as never,
      );

      await service.downloadAndFormat(makeTrack() as never, "/out");

      expect(mockDownloadAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ format: expect.objectContaining({ quality: 9 }) }),
      );
    });

    it("passes cookies file path via --cookies when YT_COOKIES contains '/'", async () => {
      mockDownloadAsync.mockResolvedValue(undefined);
      mockGetInfoAsync.mockResolvedValue({});

      const service = new YoutubeDownloadService(
        makeSettings({ YT_COOKIES: "/config/cookies.txt" }) as never,
        makeSearchService() as never,
      );

      await service.downloadAndFormat(makeTrack() as never, "/out");

      expect(mockDownloadAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          cookies: "/config/cookies.txt",
          cookiesFromBrowser: undefined,
        }),
      );
    });

    it("passes browser name via cookiesFromBrowser when YT_COOKIES is a browser name", async () => {
      mockDownloadAsync.mockResolvedValue(undefined);
      mockGetInfoAsync.mockResolvedValue({});

      const service = new YoutubeDownloadService(
        makeSettings({ YT_COOKIES: "firefox" }) as never,
        makeSearchService() as never,
      );

      await service.downloadAndFormat(makeTrack() as never, "/out");

      expect(mockDownloadAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          cookies: undefined,
          cookiesFromBrowser: "firefox",
        }),
      );
    });

    it("returns undefined durationMs when getInfoAsync throws", async () => {
      mockDownloadAsync.mockResolvedValue(undefined);
      mockGetInfoAsync.mockRejectedValue(new Error("info unavailable"));

      const service = new YoutubeDownloadService(
        makeSettings() as never,
        makeSearchService() as never,
      );

      const result = await service.downloadAndFormat(makeTrack() as never, "/out");
      expect(result.durationMs).toBeUndefined();
    });

    it("returns undefined durationMs when duration is not a positive number", async () => {
      mockDownloadAsync.mockResolvedValue(undefined);
      mockGetInfoAsync.mockResolvedValue({ duration: 0 });

      const service = new YoutubeDownloadService(
        makeSettings() as never,
        makeSearchService() as never,
      );

      const result = await service.downloadAndFormat(makeTrack() as never, "/out");
      expect(result.durationMs).toBeUndefined();
    });
  });
});
