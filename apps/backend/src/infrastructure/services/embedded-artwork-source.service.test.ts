import { parseFile } from "music-metadata";
import { mkdir, writeFile } from "node:fs/promises";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { EmbeddedArtworkSourceService } from "./embedded-artwork-source.service";

// Mock music-metadata and fs/promises before importing the service
vi.mock("music-metadata", () => ({
  parseFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

const parseFileMock = vi.mocked(parseFile);
const mkdirMock = vi.mocked(mkdir);
const writeFileMock = vi.mocked(writeFile);

describe("EmbeddedArtworkSourceService", () => {
  let service: EmbeddedArtworkSourceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EmbeddedArtworkSourceService();
  });

  it("returns null when the track list is empty", async () => {
    const result = await service.extractFromTracks([]);
    expect(result).toBeNull();
  });

  it("returns null when no track contains embedded artwork", async () => {
    parseFileMock.mockResolvedValue({ common: { picture: [] } } as any);

    const result = await service.extractFromTracks(["/music/track.mp3"]);
    expect(result).toBeNull();
  });

  it("returns null when the picture has no data", async () => {
    parseFileMock.mockResolvedValue({
      common: { picture: [{ format: "image/jpeg", data: null }] },
    } as any);

    const result = await service.extractFromTracks(["/music/track.mp3"]);
    expect(result).toBeNull();
  });

  it("returns null when the picture format is unsupported", async () => {
    parseFileMock.mockResolvedValue({
      common: {
        picture: [{ format: "image/bmp", data: Buffer.from("fakebytes") }],
      },
    } as any);

    const result = await service.extractFromTracks(["/music/track.mp3"]);
    expect(result).toBeNull();
  });

  it("extracts artwork from a jpeg picture and writes it to a temp file", async () => {
    const fakeData = Buffer.from("jpeg-data");
    parseFileMock.mockResolvedValue({
      common: { picture: [{ format: "image/jpeg", data: fakeData }] },
    } as any);

    const result = await service.extractFromTracks(["/music/track.mp3"]);

    expect(result).not.toBeNull();
    expect(result).toMatch(/^file:\/\//);
    expect(result).toMatch(/\.jpg$/);
    expect(mkdirMock).toHaveBeenCalledOnce();
    expect(writeFileMock).toHaveBeenCalledOnce();
    expect(writeFileMock).toHaveBeenCalledWith(expect.stringContaining(".jpg"), fakeData);
  });

  it("extracts artwork from a png picture", async () => {
    const fakeData = Buffer.from("png-data");
    parseFileMock.mockResolvedValue({
      common: { picture: [{ format: "image/png", data: fakeData }] },
    } as any);

    const result = await service.extractFromTracks(["/music/track.mp3"]);

    expect(result).toMatch(/\.png$/);
  });

  it("extracts artwork from a webp picture", async () => {
    const fakeData = Buffer.from("webp-data");
    parseFileMock.mockResolvedValue({
      common: { picture: [{ format: "image/webp", data: fakeData }] },
    } as any);

    const result = await service.extractFromTracks(["/music/track.mp3"]);

    expect(result).toMatch(/\.webp$/);
  });

  it("accepts 'image/jpg' as an alias for jpeg and uses .jpg extension", async () => {
    const fakeData = Buffer.from("jpg-data");
    parseFileMock.mockResolvedValue({
      common: { picture: [{ format: "image/jpg", data: fakeData }] },
    } as any);

    const result = await service.extractFromTracks(["/music/track.mp3"]);

    expect(result).toMatch(/\.jpg$/);
  });

  it("skips a failing track and tries the next one", async () => {
    const fakeData = Buffer.from("jpeg-data");
    parseFileMock.mockRejectedValueOnce(new Error("corrupt file")).mockResolvedValueOnce({
      common: { picture: [{ format: "image/jpeg", data: fakeData }] },
    } as any);

    const result = await service.extractFromTracks([
      "/music/bad-track.mp3",
      "/music/good-track.mp3",
    ]);

    expect(result).not.toBeNull();
    expect(result).toMatch(/^file:\/\//);
  });

  it("returns null when all tracks fail to parse", async () => {
    parseFileMock.mockRejectedValue(new Error("parse error"));

    const result = await service.extractFromTracks(["/music/a.mp3", "/music/b.mp3"]);
    expect(result).toBeNull();
  });

  it("writes to the spotiarr-artwork-backfill subdirectory of tmpdir", async () => {
    const fakeData = Buffer.from("jpeg-data");
    parseFileMock.mockResolvedValue({
      common: { picture: [{ format: "image/jpeg", data: fakeData }] },
    } as any);

    await service.extractFromTracks(["/music/track.mp3"]);

    const mkdirPath = mkdirMock.mock.calls[0][0] as string;
    expect(mkdirPath).toContain("spotiarr-artwork-backfill");
  });

  it("creates the tmp directory with recursive: true", async () => {
    const fakeData = Buffer.from("jpeg-data");
    parseFileMock.mockResolvedValue({
      common: { picture: [{ format: "image/jpeg", data: fakeData }] },
    } as any);

    await service.extractFromTracks(["/music/track.mp3"]);

    expect(mkdirMock).toHaveBeenCalledWith(expect.stringContaining("spotiarr-artwork-backfill"), {
      recursive: true,
    });
  });
});
