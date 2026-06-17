import { beforeEach, describe, expect, it, vi } from "vitest";
import { MetadataService } from "./metadata.service";

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

  describe("performerInfo (album artist)", () => {
    it("uses albumArtist for performerInfo when provided", async () => {
      const service = new MetadataService();

      await service.writeTags("/library/song.mp3", {
        title: "Track",
        artist: "Artist",
        albumArtist: "Album Artist",
      });

      expect(writeMock).toHaveBeenCalledWith(
        expect.objectContaining({ performerInfo: "Album Artist" }),
        "/library/song.mp3",
      );
    });

    it("falls back to artist for performerInfo when albumArtist is not provided", async () => {
      const service = new MetadataService();

      await service.writeTags("/library/song.mp3", {
        title: "Track",
        artist: "Solo Artist",
      });

      expect(writeMock).toHaveBeenCalledWith(
        expect.objectContaining({ performerInfo: "Solo Artist" }),
        "/library/song.mp3",
      );
    });
  });

  describe("album", () => {
    it("sets tags.album when album is provided", async () => {
      const service = new MetadataService();

      await service.writeTags("/library/song.mp3", {
        title: "Track",
        artist: "Artist",
        album: "My Album",
      });

      expect(writeMock).toHaveBeenCalledWith(
        expect.objectContaining({ album: "My Album" }),
        "/library/song.mp3",
      );
    });

    it("does not set tags.album when album is not provided", async () => {
      const service = new MetadataService();

      await service.writeTags("/library/song.mp3", {
        title: "Track",
        artist: "Artist",
      });

      const [tags] = writeMock.mock.calls[0];
      expect(tags).not.toHaveProperty("album");
    });
  });

  describe("albumYear", () => {
    it("sets tags.year as string when albumYear is provided", async () => {
      const service = new MetadataService();

      await service.writeTags("/library/song.mp3", {
        title: "Track",
        artist: "Artist",
        albumYear: 2024,
      });

      expect(writeMock).toHaveBeenCalledWith(
        expect.objectContaining({ year: "2024" }),
        "/library/song.mp3",
      );
    });

    it("does not set tags.year when albumYear is not provided", async () => {
      const service = new MetadataService();

      await service.writeTags("/library/song.mp3", {
        title: "Track",
        artist: "Artist",
      });

      const [tags] = writeMock.mock.calls[0];
      expect(tags).not.toHaveProperty("year");
    });
  });

  describe("trackNumber", () => {
    it("sets tags.trackNumber as 'n/total' when both trackNumber and totalTracks are provided", async () => {
      const service = new MetadataService();

      await service.writeTags("/library/song.mp3", {
        title: "Track",
        artist: "Artist",
        trackNumber: 3,
        totalTracks: 10,
      });

      expect(writeMock).toHaveBeenCalledWith(
        expect.objectContaining({ trackNumber: "3/10" }),
        "/library/song.mp3",
      );
    });

    it("sets tags.trackNumber as plain string when trackNumber is provided without totalTracks", async () => {
      const service = new MetadataService();

      await service.writeTags("/library/song.mp3", {
        title: "Track",
        artist: "Artist",
        trackNumber: 3,
      });

      expect(writeMock).toHaveBeenCalledWith(
        expect.objectContaining({ trackNumber: "3" }),
        "/library/song.mp3",
      );
    });

    it("does not set tags.trackNumber when trackNumber is not provided", async () => {
      const service = new MetadataService();

      await service.writeTags("/library/song.mp3", {
        title: "Track",
        artist: "Artist",
      });

      const [tags] = writeMock.mock.calls[0];
      expect(tags).not.toHaveProperty("trackNumber");
    });
  });

  describe("discNumber", () => {
    it("sets tags.partOfSet when discNumber is provided", async () => {
      const service = new MetadataService();

      await service.writeTags("/library/song.mp3", {
        title: "Track",
        artist: "Artist",
        discNumber: 2,
      });

      expect(writeMock).toHaveBeenCalledWith(
        expect.objectContaining({ partOfSet: "2" }),
        "/library/song.mp3",
      );
    });

    it("does not set tags.partOfSet when discNumber is not provided", async () => {
      const service = new MetadataService();

      await service.writeTags("/library/song.mp3", {
        title: "Track",
        artist: "Artist",
      });

      const [tags] = writeMock.mock.calls[0];
      expect(tags).not.toHaveProperty("partOfSet");
    });
  });

  describe("NodeID3.write result handling", () => {
    it("calls logger.warn when NodeID3.write returns false", async () => {
      writeMock.mockReturnValue(false);
      loggerMock.warn.mockClear();
      const service = new MetadataService();

      await service.writeTags("/library/song.mp3", {
        title: "Track",
        artist: "Artist",
      });

      expect(loggerMock.warn).toHaveBeenCalledWith(
        expect.objectContaining({ filePath: "/library/song.mp3" }),
        expect.stringContaining("NodeID3.write returned false"),
      );
    });

    it("does not call logger.warn when NodeID3.write returns true", async () => {
      writeMock.mockReturnValue(true);
      loggerMock.warn.mockClear();
      const service = new MetadataService();

      await service.writeTags("/library/song.mp3", {
        title: "Track",
        artist: "Artist",
      });

      expect(loggerMock.warn).not.toHaveBeenCalled();
    });
  });
});
