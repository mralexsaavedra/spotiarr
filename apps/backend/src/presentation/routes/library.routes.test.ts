import express from "express";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LibraryService } from "@/application/services/library.service";
import { FileSystemLibraryAudioService } from "@/infrastructure/services/library-audio.service";
import { FileSystemLibraryImageService } from "@/infrastructure/services/library-image.service";
import { LibraryController } from "@/presentation/controllers/library.controller";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import { libraryAudioRequestSchema } from "./schemas/library.schema";

const loggerMock = vi.hoisted(() => {
  const mock = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  };
  mock.child.mockReturnValue(mock);
  return mock;
});
vi.mock("@/infrastructure/logging/logger", () => ({ logger: loggerMock }));

const tempDirs: string[] = [];
const servers: http.Server[] = [];

async function makeTempDir(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

async function startTestServer(downloadsRoot: string): Promise<string> {
  const libraryController = new LibraryController(
    {} as LibraryService,
    new FileSystemLibraryAudioService(downloadsRoot),
    new FileSystemLibraryImageService(downloadsRoot),
  );

  const app = express();
  app.get("/image", asyncHandler(libraryController.getImage));
  app.get(
    "/audio",
    validate(libraryAudioRequestSchema),
    asyncHandler(libraryController.streamAudio),
  );

  const server = await new Promise<http.Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  servers.push(server);
  const address = server.address();

  if (address && typeof address === "object") {
    return `http://127.0.0.1:${address.port}`;
  }

  throw new Error("Unable to resolve server address");
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        }),
    ),
  );

  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("GET /image integration", () => {
  it("serves image inside downloads root", async () => {
    const downloadsRoot = await makeTempDir("lib-route-root-");
    const filePath = path.join(downloadsRoot, "Artist", "cover.jpg");

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "image-content");

    const baseUrl = await startTestServer(downloadsRoot);
    const response = await fetch(`${baseUrl}/image?path=${encodeURIComponent(filePath)}`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/jpeg");
    expect(await response.text()).toBe("image-content");
  });

  it("returns 404 for absolute path outside downloads root", async () => {
    const downloadsRoot = await makeTempDir("lib-route-root-");
    const outsideRoot = await makeTempDir("lib-route-out-");
    const outsideFile = path.join(outsideRoot, "cover.jpg");

    await fs.writeFile(outsideFile, "image-content");

    const baseUrl = await startTestServer(downloadsRoot);
    const response = await fetch(`${baseUrl}/image?path=${encodeURIComponent(outsideFile)}`);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "file_not_found", message: "File not found" });
  });

  it("returns 404 for traversal path", async () => {
    const downloadsRoot = await makeTempDir("lib-route-root-");
    const baseUrl = await startTestServer(downloadsRoot);
    const traversalPath = `..${path.sep}outside.jpg`;

    const response = await fetch(`${baseUrl}/image?path=${encodeURIComponent(traversalPath)}`);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "file_not_found", message: "File not found" });
  });

  it("returns 404 for symlink escape", async () => {
    const downloadsRoot = await makeTempDir("lib-route-root-");
    const outsideRoot = await makeTempDir("lib-route-out-");
    const outsideFile = path.join(outsideRoot, "cover.webp");
    const symlinkPath = path.join(downloadsRoot, "link.webp");

    await fs.writeFile(outsideFile, "image-content");
    await fs.symlink(outsideFile, symlinkPath);

    const baseUrl = await startTestServer(downloadsRoot);
    const response = await fetch(`${baseUrl}/image?path=${encodeURIComponent(symlinkPath)}`);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "file_not_found", message: "File not found" });
  });

  it("returns 404 for non-image extension", async () => {
    const downloadsRoot = await makeTempDir("lib-route-root-");
    const filePath = path.join(downloadsRoot, "Artist", "cover.txt");

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "not-image");

    const baseUrl = await startTestServer(downloadsRoot);
    const response = await fetch(`${baseUrl}/image?path=${encodeURIComponent(filePath)}`);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "file_not_found", message: "File not found" });
  });

  it("returns 400 for missing path query", async () => {
    const downloadsRoot = await makeTempDir("lib-route-root-");
    const baseUrl = await startTestServer(downloadsRoot);
    loggerMock.warn.mockClear();

    const response = await fetch(`${baseUrl}/image`);
    const body = (await response.json()) as { error: string; message: string };

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: "invalid_request",
      message: "Image path is required",
    });
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "missing-path" }),
      "Request rejected",
    );
  });

  it("returns 400 for non-string path query", async () => {
    const downloadsRoot = await makeTempDir("lib-route-root-");
    const baseUrl = await startTestServer(downloadsRoot);
    loggerMock.warn.mockClear();

    const response = await fetch(`${baseUrl}/image?path=a&path=b`);
    const body = (await response.json()) as { error: string; message: string };

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: "invalid_request",
      message: "Image path is required",
    });
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "missing-path" }),
      "Request rejected",
    );
  });

  it("returns 404 for non-existent image path inside downloads root", async () => {
    const downloadsRoot = await makeTempDir("lib-route-root-");
    const missingInsideDownloads = path.join(downloadsRoot, "Artist", "missing-cover.png");
    const baseUrl = await startTestServer(downloadsRoot);

    const response = await fetch(
      `${baseUrl}/image?path=${encodeURIComponent(missingInsideDownloads)}`,
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "file_not_found", message: "File not found" });
  });

  it("returns 404 for URL-encoded traversal", async () => {
    const downloadsRoot = await makeTempDir("lib-route-root-");
    const baseUrl = await startTestServer(downloadsRoot);

    const response = await fetch(`${baseUrl}/image?path=%2e%2e%2fescape.jpg`);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "file_not_found", message: "File not found" });
  });

  it("serves cached artwork files inside .spotiarr directory", async () => {
    const downloadsRoot = await makeTempDir("lib-route-root-");
    const cachedArtworkPath = path.join(
      downloadsRoot,
      ".spotiarr",
      "cache",
      "artwork",
      "cover.jpg",
    );

    await fs.mkdir(path.dirname(cachedArtworkPath), { recursive: true });
    await fs.writeFile(cachedArtworkPath, "cached-image-content");

    const baseUrl = await startTestServer(downloadsRoot);
    const response = await fetch(`${baseUrl}/image?path=${encodeURIComponent(cachedArtworkPath)}`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/jpeg");
    expect(await response.text()).toBe("cached-image-content");
  });
});

describe("GET /audio integration", () => {
  it("serves audio file inside downloads root", async () => {
    const downloadsRoot = await makeTempDir("lib-audio-route-root-");
    const filePath = path.join(downloadsRoot, "Artist", "song.mp3");

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "audio-content");

    const baseUrl = await startTestServer(downloadsRoot);
    const response = await fetch(`${baseUrl}/audio?path=${encodeURIComponent(filePath)}`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("audio/mpeg");
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(response.headers.get("content-length")).toBe("13");
    expect(await response.text()).toBe("audio-content");
  });

  it("returns partial content when range header is provided", async () => {
    const downloadsRoot = await makeTempDir("lib-audio-route-root-");
    const filePath = path.join(downloadsRoot, "Artist", "song.mp3");

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "abcdef");

    const baseUrl = await startTestServer(downloadsRoot);
    const response = await fetch(`${baseUrl}/audio?path=${encodeURIComponent(filePath)}`, {
      headers: { Range: "bytes=0-2" },
    });

    expect(response.status).toBe(206);
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(response.headers.get("content-range")).toBe("bytes 0-2/6");
    expect(response.headers.get("content-length")).toBe("3");
    expect(await response.text()).toBe("abc");
  });

  it("returns suffix byte range from the end of file", async () => {
    const downloadsRoot = await makeTempDir("lib-audio-route-root-");
    const filePath = path.join(downloadsRoot, "Artist", "song.mp3");

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "abcdef");

    const baseUrl = await startTestServer(downloadsRoot);
    const response = await fetch(`${baseUrl}/audio?path=${encodeURIComponent(filePath)}`, {
      headers: { Range: "bytes=-2" },
    });

    expect(response.status).toBe(206);
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(response.headers.get("content-range")).toBe("bytes 4-5/6");
    expect(response.headers.get("content-length")).toBe("2");
    expect(await response.text()).toBe("ef");
  });

  it("returns explicit byte range with start and end", async () => {
    const downloadsRoot = await makeTempDir("lib-audio-route-root-");
    const filePath = path.join(downloadsRoot, "Artist", "song.mp3");

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "abcdef");

    const baseUrl = await startTestServer(downloadsRoot);
    const response = await fetch(`${baseUrl}/audio?path=${encodeURIComponent(filePath)}`, {
      headers: { Range: "bytes=1-3" },
    });

    expect(response.status).toBe(206);
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(response.headers.get("content-range")).toBe("bytes 1-3/6");
    expect(response.headers.get("content-length")).toBe("3");
    expect(await response.text()).toBe("bcd");
  });

  it("returns open-ended byte range from explicit start", async () => {
    const downloadsRoot = await makeTempDir("lib-audio-route-root-");
    const filePath = path.join(downloadsRoot, "Artist", "song.mp3");

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "abcdef");

    const baseUrl = await startTestServer(downloadsRoot);
    const response = await fetch(`${baseUrl}/audio?path=${encodeURIComponent(filePath)}`, {
      headers: { Range: "bytes=2-" },
    });

    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 2-5/6");
    expect(response.headers.get("content-length")).toBe("4");
    expect(await response.text()).toBe("cdef");
  });

  it("returns 416 for unsatisfiable range", async () => {
    const downloadsRoot = await makeTempDir("lib-audio-route-root-");
    const filePath = path.join(downloadsRoot, "Artist", "song.mp3");

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "abc");

    const baseUrl = await startTestServer(downloadsRoot);
    const response = await fetch(`${baseUrl}/audio?path=${encodeURIComponent(filePath)}`, {
      headers: { Range: "bytes=999-" },
    });

    expect(response.status).toBe(416);
    expect(response.headers.get("content-range")).toBe("bytes */3");
    expect(await response.json()).toEqual({
      error: "invalid_range",
      message: "Range Not Satisfiable",
    });
  });

  it("returns 416 for empty range value", async () => {
    const downloadsRoot = await makeTempDir("lib-audio-route-root-");
    const filePath = path.join(downloadsRoot, "Artist", "song.mp3");

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "abcdef");

    const baseUrl = await startTestServer(downloadsRoot);
    const response = await fetch(`${baseUrl}/audio?path=${encodeURIComponent(filePath)}`, {
      headers: { Range: "bytes=" },
    });

    expect(response.status).toBe(416);
    expect(response.headers.get("content-range")).toBe("bytes */6");
  });

  it("returns 416 for zero-length suffix range", async () => {
    const downloadsRoot = await makeTempDir("lib-audio-route-root-");
    const filePath = path.join(downloadsRoot, "Artist", "song.mp3");

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "abcdef");

    const baseUrl = await startTestServer(downloadsRoot);
    const response = await fetch(`${baseUrl}/audio?path=${encodeURIComponent(filePath)}`, {
      headers: { Range: "bytes=-0" },
    });

    expect(response.status).toBe(416);
    expect(response.headers.get("content-range")).toBe("bytes */6");
  });

  it("returns 416 when range start is greater than end", async () => {
    const downloadsRoot = await makeTempDir("lib-audio-route-root-");
    const filePath = path.join(downloadsRoot, "Artist", "song.mp3");

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "abcdef");

    const baseUrl = await startTestServer(downloadsRoot);
    const response = await fetch(`${baseUrl}/audio?path=${encodeURIComponent(filePath)}`, {
      headers: { Range: "bytes=3-2" },
    });

    expect(response.status).toBe(416);
    expect(response.headers.get("content-range")).toBe("bytes */6");
  });

  it("normalizes oversized explicit end to file boundary", async () => {
    const downloadsRoot = await makeTempDir("lib-audio-route-root-");
    const filePath = path.join(downloadsRoot, "Artist", "song.mp3");

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "abc");

    const baseUrl = await startTestServer(downloadsRoot);
    const response = await fetch(`${baseUrl}/audio?path=${encodeURIComponent(filePath)}`, {
      headers: { Range: "bytes=0-999" },
    });

    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 0-2/3");
    expect(response.headers.get("content-length")).toBe("3");
    expect(await response.text()).toBe("abc");
  });

  it("clamps oversized suffix range to full file", async () => {
    const downloadsRoot = await makeTempDir("lib-audio-route-root-");
    const filePath = path.join(downloadsRoot, "Artist", "song.mp3");

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "abc");

    const baseUrl = await startTestServer(downloadsRoot);
    const response = await fetch(`${baseUrl}/audio?path=${encodeURIComponent(filePath)}`, {
      headers: { Range: "bytes=-999" },
    });

    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 0-2/3");
    expect(response.headers.get("content-length")).toBe("3");
    expect(await response.text()).toBe("abc");
  });

  it("returns 416 for any range on zero-byte files", async () => {
    const downloadsRoot = await makeTempDir("lib-audio-route-root-");
    const filePath = path.join(downloadsRoot, "Artist", "empty.mp3");

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "");

    const baseUrl = await startTestServer(downloadsRoot);
    const response = await fetch(`${baseUrl}/audio?path=${encodeURIComponent(filePath)}`, {
      headers: { Range: "bytes=-1" },
    });

    expect(response.status).toBe(416);
    expect(response.headers.get("content-range")).toBe("bytes */0");
    expect(await response.json()).toEqual({
      error: "invalid_range",
      message: "Range Not Satisfiable",
    });
  });

  it("returns 400 for missing path query", async () => {
    const downloadsRoot = await makeTempDir("lib-audio-route-root-");
    const baseUrl = await startTestServer(downloadsRoot);

    const response = await fetch(`${baseUrl}/audio`);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "validation_error",
      message: "Invalid request data",
      details: [
        { path: "query.path", message: "Invalid input: expected string, received undefined" },
      ],
    });
  });

  it("returns 404 for unsupported extension", async () => {
    const downloadsRoot = await makeTempDir("lib-audio-route-root-");
    const filePath = path.join(downloadsRoot, "Artist", "cover.jpg");

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "image-content");

    const baseUrl = await startTestServer(downloadsRoot);
    const response = await fetch(`${baseUrl}/audio?path=${encodeURIComponent(filePath)}`);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "file_not_found", message: "File not found" });
  });
});
