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

const mockExecSync = vi.hoisted(() => vi.fn());
const mockAccessSync = vi.hoisted(() => vi.fn());
const mockCopyFileSync = vi.hoisted(() => vi.fn());
const mockChmodSync = vi.hoisted(() => vi.fn());

vi.mock("child_process", () => ({
  execSync: mockExecSync,
}));

vi.mock("fs", () => ({
  default: {
    accessSync: mockAccessSync,
    copyFileSync: mockCopyFileSync,
    chmodSync: mockChmodSync,
    constants: { W_OK: 2 },
  },
  accessSync: mockAccessSync,
  copyFileSync: mockCopyFileSync,
  chmodSync: mockChmodSync,
  constants: { W_OK: 2 },
}));

describe("detectYtDlpPath", () => {
  it("returns the system path when the binary is writable", async () => {
    const { detectYtDlpPath } = await import("./youtube-binary");

    mockExecSync.mockReturnValue("/usr/bin/yt-dlp\n");
    mockAccessSync.mockReturnValue(undefined); // does not throw → writable

    const result = detectYtDlpPath();

    expect(result).toBe("/usr/bin/yt-dlp");
    expect(mockCopyFileSync).not.toHaveBeenCalled();
  });

  it("copies to tmp and returns tmp path when the system binary is not writable", async () => {
    const { detectYtDlpPath } = await import("./youtube-binary");

    mockExecSync.mockReturnValue("/usr/bin/yt-dlp\n");
    mockAccessSync.mockImplementation(() => {
      throw new Error("EACCES");
    });

    const result = detectYtDlpPath();

    expect(result).toContain("yt-dlp");
    expect(mockCopyFileSync).toHaveBeenCalledWith(
      "/usr/bin/yt-dlp",
      expect.stringContaining("yt-dlp"),
    );
    expect(mockChmodSync).toHaveBeenCalledWith(expect.stringContaining("yt-dlp"), 0o755);
  });

  it("isWritable returns false when fs.accessSync throws", async () => {
    const { detectYtDlpPath } = await import("./youtube-binary");

    mockExecSync.mockReturnValue("/usr/bin/yt-dlp\n");
    mockAccessSync.mockImplementation(() => {
      throw new Error("EACCES");
    });
    mockCopyFileSync.mockReset();
    mockChmodSync.mockReset();

    detectYtDlpPath();

    // fallback path was taken, confirming isWritable returned false
    expect(mockCopyFileSync).toHaveBeenCalledTimes(1);
  });

  it("throws when execSync fails to find yt-dlp in PATH", async () => {
    const { detectYtDlpPath } = await import("./youtube-binary");

    mockExecSync.mockImplementation(() => {
      throw new Error("Command failed: which yt-dlp");
    });

    expect(() => detectYtDlpPath()).toThrow();
  });
});
