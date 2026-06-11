import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/domain/errors/app-error";
import { YoutubeSearchService } from "./youtube-search.service";

const execFileMock = vi.fn();

vi.mock("child_process", () => ({
  execFile: (...args: unknown[]) => execFileMock(...args),
}));

vi.mock("./youtube-binary", () => ({
  detectYtDlpPath: () => "/usr/bin/yt-dlp",
}));

vi.mock("./youtube.constants", () => ({
  YOUTUBE_USER_AGENT: "test-agent",
}));

interface SettingsStub {
  getNumber: ReturnType<typeof vi.fn>;
  getString: ReturnType<typeof vi.fn>;
}

function makeService(settings?: Partial<SettingsStub>): {
  service: YoutubeSearchService;
  settings: SettingsStub;
} {
  const settingsService: SettingsStub = {
    getNumber: vi.fn().mockResolvedValue(1000),
    getString: vi.fn().mockResolvedValue(""),
    ...settings,
  };
  return {
    service: new YoutubeSearchService(settingsService as never),
    settings: settingsService,
  };
}

// Resolve the promisified execFile callback with a yt-dlp style payload.
function resolveWith(stdout: string): void {
  execFileMock.mockImplementation((_path, _args, cb: (e: unknown, r: unknown) => void) =>
    cb(null, { stdout, stderr: "" }),
  );
}

describe("YoutubeSearchService.findOnYoutubeOne", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    execFileMock.mockReset();
    vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns the first non-empty url from stdout", async () => {
    resolveWith("https://youtu.be/abc\nhttps://youtu.be/def\n");
    const { service } = makeService();

    const promise = service.findOnYoutubeOne("Artist", "Song");
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe("https://youtu.be/abc");
    expect(execFileMock).toHaveBeenCalledTimes(1);
  });

  it("throws a 404 AppError when no results are returned", async () => {
    resolveWith("\n  \n");
    const { service } = makeService();

    const promise = service.findOnYoutubeOne("Artist", "Song");
    const caught = promise.catch((e) => e);
    await vi.runAllTimersAsync();

    const error = await caught;
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ statusCode: 404, errorCode: "track_not_found" });
  });

  it("uses stdout when yt-dlp exits non-zero but still printed a url", async () => {
    execFileMock.mockImplementation((_path, _args, cb: (e: unknown, r: unknown) => void) =>
      cb(Object.assign(new Error("non-zero exit"), { stdout: "https://youtu.be/xyz\n" }), null),
    );
    const { service } = makeService();

    const promise = service.findOnYoutubeOne("Artist", "Song");
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe("https://youtu.be/xyz");
    expect(execFileMock).toHaveBeenCalledTimes(1);
  });

  it("retries with a 5s backoff on a rate-limit error, then succeeds", async () => {
    execFileMock
      .mockImplementationOnce((_p, _a, cb: (e: unknown, r: unknown) => void) =>
        cb(Object.assign(new Error("fail"), { stderr: "Sign in to confirm rate-limited" }), null),
      )
      .mockImplementationOnce((_p, _a, cb: (e: unknown, r: unknown) => void) =>
        cb(null, { stdout: "https://youtu.be/ok\n", stderr: "" }),
      );
    const { service } = makeService();

    const promise = service.findOnYoutubeOne("Artist", "Song");

    // Flush the first attempt; the retry must wait for the 5s backoff window.
    await vi.advanceTimersByTimeAsync(0);
    expect(execFileMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(4999);
    expect(execFileMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(execFileMock).toHaveBeenCalledTimes(2);

    await expect(promise).resolves.toBe("https://youtu.be/ok");
  });

  it("gives up after exhausting the retry budget", async () => {
    execFileMock.mockImplementation((_p, _a, cb: (e: unknown, r: unknown) => void) =>
      cb(Object.assign(new Error("fail"), { stderr: "rate limited" }), null),
    );
    const { service } = makeService();

    const promise = service.findOnYoutubeOne("Artist", "Song");
    const assertion = expect(promise).rejects.toThrow();
    await vi.runAllTimersAsync();
    await assertion;

    // Initial attempt + 3 retries.
    expect(execFileMock).toHaveBeenCalledTimes(4);
  });

  it("passes --cookies for a file path and --cookies-from-browser for a browser name", async () => {
    resolveWith("https://youtu.be/abc\n");
    const { service } = makeService({
      getString: vi.fn().mockResolvedValue("/config/cookies.txt"),
    });

    const filePromise = service.findOnYoutubeOne("Artist", "Song");
    await vi.runAllTimersAsync();
    await filePromise;

    expect(execFileMock.mock.calls[0][1]).toContain("--cookies");
    expect(execFileMock.mock.calls[0][1]).toContain("/config/cookies.txt");

    execFileMock.mockReset();
    resolveWith("https://youtu.be/abc\n");
    const { service: browserService } = makeService({
      getString: vi.fn().mockResolvedValue("firefox"),
    });

    const browserPromise = browserService.findOnYoutubeOne("Artist", "Song");
    await vi.runAllTimersAsync();
    await browserPromise;

    expect(execFileMock.mock.calls[0][1]).toContain("--cookies-from-browser");
    expect(execFileMock.mock.calls[0][1]).toContain("firefox");
  });
});
