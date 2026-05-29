import { beforeEach, describe, expect, it, vi } from "vitest";
import { MetadataService } from "./metadata.service";

const { writeMock } = vi.hoisted(() => ({
  writeMock: vi.fn(),
}));

vi.mock("node-id3", () => ({
  default: {
    write: writeMock,
  },
  write: writeMock,
}));

describe("MetadataService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writeMock.mockReturnValue(true);
  });

  it("embeds artwork image using provided coverBuffer", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const service = new MetadataService();
    const coverBuffer = Buffer.from([0xff, 0xd8, 0xff]);

    await service.writeTags("/library/song.mp3", {
      title: "Track",
      artist: "Artist",
      coverBuffer,
    });

    expect(writeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        image: expect.objectContaining({
          imageBuffer: coverBuffer,
        }),
      }),
      "/library/song.mp3",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("does not fetch artwork when no coverBuffer is provided", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const service = new MetadataService();

    await service.writeTags("/library/song.mp3", {
      title: "Track",
      artist: "Artist",
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("does not expose a URL-based saveCoverArt API", () => {
    const service = new MetadataService() as MetadataService & {
      saveCoverArt?: unknown;
    };

    expect(service.saveCoverArt).toBeUndefined();
  });
});
