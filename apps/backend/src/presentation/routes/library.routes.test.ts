import express from "express";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LibraryService } from "@/application/services/library.service";
import { FileSystemLibraryImageService } from "@/infrastructure/services/library-image.service";
import { LibraryController } from "@/presentation/controllers/library.controller";
import { asyncHandler } from "../middleware/async-handler";

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
    new FileSystemLibraryImageService(downloadsRoot),
  );

  const app = express();
  app.get("/image", asyncHandler(libraryController.getImage));

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
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const response = await fetch(`${baseUrl}/image`);
    const body = (await response.json()) as { error: string; message: string };

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: "invalid_request",
      message: "Image path is required",
    });
    expect(warnSpy).toHaveBeenCalledWith("[LibraryImageService] Request rejected", {
      reason: "missing-path",
    });
  });

  it("returns 400 for non-string path query", async () => {
    const downloadsRoot = await makeTempDir("lib-route-root-");
    const baseUrl = await startTestServer(downloadsRoot);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const response = await fetch(`${baseUrl}/image?path=a&path=b`);
    const body = (await response.json()) as { error: string; message: string };

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: "invalid_request",
      message: "Image path is required",
    });
    expect(warnSpy).toHaveBeenCalledWith("[LibraryImageService] Request rejected", {
      reason: "missing-path",
    });
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
