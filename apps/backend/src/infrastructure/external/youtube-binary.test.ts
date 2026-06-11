import { describe, expect, it, vi } from "vitest";
import { resolveYtDlpPath, type YtDlpResolverDeps } from "./youtube-binary";

const buildDeps = (overrides: Partial<YtDlpResolverDeps> = {}): YtDlpResolverDeps => ({
  which: () => "/opt/homebrew/bin/yt-dlp",
  isWritable: () => true,
  copyFile: vi.fn(),
  chmod: vi.fn(),
  tmpFile: "/tmp/yt-dlp",
  ...overrides,
});

describe("resolveYtDlpPath", () => {
  it("uses the system path directly when the binary is writable", () => {
    const copyFile = vi.fn();
    const deps = buildDeps({ isWritable: () => true, copyFile });

    expect(resolveYtDlpPath(deps)).toBe("/opt/homebrew/bin/yt-dlp");
    expect(copyFile).not.toHaveBeenCalled();
  });

  it("copies to the writable tmp path when the system binary is not writable", () => {
    const copyFile = vi.fn();
    const chmod = vi.fn();
    const deps = buildDeps({
      which: () => "/usr/bin/yt-dlp",
      isWritable: () => false,
      copyFile,
      chmod,
      tmpFile: "/tmp/yt-dlp",
    });

    expect(resolveYtDlpPath(deps)).toBe("/tmp/yt-dlp");
    expect(copyFile).toHaveBeenCalledWith("/usr/bin/yt-dlp", "/tmp/yt-dlp");
    expect(chmod).toHaveBeenCalledWith("/tmp/yt-dlp", 0o755);
  });

  it("always refreshes the tmp copy so an upgraded binary propagates", () => {
    const copyFile = vi.fn();
    const deps = buildDeps({ isWritable: () => false, copyFile });

    resolveYtDlpPath(deps);
    resolveYtDlpPath(deps);

    expect(copyFile).toHaveBeenCalledTimes(2);
  });

  it("throws when no system binary is found so the caller can fall back", () => {
    const deps = buildDeps({ which: () => "" });

    expect(() => resolveYtDlpPath(deps)).toThrow();
  });
});
