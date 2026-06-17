import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ArtworkBackfillCandidate } from "@/application/ports/artwork-backfill-sources.port";
import { DeezerArtworkSourceService } from "./deezer-artwork-source.service";
import type { DeezerArtist, DeezerAlbum, DeezerClient } from "./deezer.client";

function makeCandidate(
  overrides: Partial<ArtworkBackfillCandidate> = {},
): ArtworkBackfillCandidate {
  return {
    type: "artist",
    cursorValue: "artist:Radiohead",
    artistName: "Radiohead",
    ...overrides,
  };
}

const mockDeezerClient = {
  searchArtist: vi.fn<() => Promise<DeezerArtist | null>>(),
  searchAlbum: vi.fn<() => Promise<DeezerAlbum | null>>(),
} satisfies Pick<DeezerClient, "searchArtist" | "searchAlbum">;

function buildService(): DeezerArtworkSourceService {
  return new DeezerArtworkSourceService(mockDeezerClient);
}

describe("DeezerArtworkSourceService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findArtistImageUrl", () => {
    it("ABF-1a: returns picture_xl URL when searchArtist returns an artist with a picture", async () => {
      mockDeezerClient.searchArtist.mockResolvedValue({
        id: 1,
        name: "Radiohead",
        picture_xl: "https://cdn.deezer.com/artist.jpg",
      } satisfies DeezerArtist);

      const service = buildService();
      const result = await service.findArtistImageUrl(makeCandidate());

      expect(mockDeezerClient.searchArtist).toHaveBeenCalledWith("Radiohead");
      expect(result).toBe("https://cdn.deezer.com/artist.jpg");
    });

    it("ABF-1b: returns null when searchArtist returns no match", async () => {
      mockDeezerClient.searchArtist.mockResolvedValue(null);

      const service = buildService();
      const result = await service.findArtistImageUrl(makeCandidate());

      expect(result).toBeNull();
    });

    it("ABF-1e: returns picture_big when picture_xl is absent", async () => {
      mockDeezerClient.searchArtist.mockResolvedValue({
        id: 1,
        name: "Radiohead",
        picture_big: "https://cdn.deezer.com/artist-big.jpg",
      } satisfies DeezerArtist);

      const service = buildService();
      const result = await service.findArtistImageUrl(makeCandidate());

      expect(result).toBe("https://cdn.deezer.com/artist-big.jpg");
    });

    it("ABF-1f: returns picture_medium when picture_xl and picture_big are absent", async () => {
      mockDeezerClient.searchArtist.mockResolvedValue({
        id: 1,
        name: "Radiohead",
        picture_medium: "https://cdn.deezer.com/artist-medium.jpg",
      } satisfies DeezerArtist);

      const service = buildService();
      const result = await service.findArtistImageUrl(makeCandidate());

      expect(result).toBe("https://cdn.deezer.com/artist-medium.jpg");
    });

    it("ABF-1g: returns picture when only picture is present", async () => {
      mockDeezerClient.searchArtist.mockResolvedValue({
        id: 1,
        name: "Radiohead",
        picture: "https://cdn.deezer.com/artist-base.jpg",
      } satisfies DeezerArtist);

      const service = buildService();
      const result = await service.findArtistImageUrl(makeCandidate());

      expect(result).toBe("https://cdn.deezer.com/artist-base.jpg");
    });

    it("ABF-1h: returns null when artist has no picture fields", async () => {
      mockDeezerClient.searchArtist.mockResolvedValue({
        id: 1,
        name: "Radiohead",
      } satisfies DeezerArtist);

      const service = buildService();
      const result = await service.findArtistImageUrl(makeCandidate());

      expect(result).toBeNull();
    });

    it("ABF-1i: returns null when searchArtist throws", async () => {
      mockDeezerClient.searchArtist.mockRejectedValue(new Error("network error"));

      const service = buildService();
      const result = await service.findArtistImageUrl(makeCandidate());

      expect(result).toBeNull();
    });
  });

  describe("findAlbumCoverUrl", () => {
    it("ABF-1c: returns cover URL when searchAlbum returns an album with a cover", async () => {
      mockDeezerClient.searchAlbum.mockResolvedValue({
        id: 99,
        title: "OK Computer",
        cover_xl: "https://cdn.deezer.com/album-cover.jpg",
      } satisfies DeezerAlbum);

      const service = buildService();
      const candidate = makeCandidate({
        type: "album",
        cursorValue: "album:Radiohead:OK Computer",
        albumName: "OK Computer",
      });
      const result = await service.findAlbumCoverUrl(candidate);

      expect(mockDeezerClient.searchAlbum).toHaveBeenCalledWith("Radiohead", "OK Computer");
      expect(result).toBe("https://cdn.deezer.com/album-cover.jpg");
    });

    it("ABF-1d: returns null when searchAlbum returns no match", async () => {
      mockDeezerClient.searchAlbum.mockResolvedValue(null);

      const service = buildService();
      const candidate = makeCandidate({
        type: "album",
        cursorValue: "album:Radiohead:Unknown",
        albumName: "Unknown",
      });
      const result = await service.findAlbumCoverUrl(candidate);

      expect(result).toBeNull();
    });

    it("ABF-1j: returns null immediately when albumName is undefined", async () => {
      const service = buildService();
      const candidate = makeCandidate({ type: "artist", cursorValue: "artist:Radiohead" });
      const result = await service.findAlbumCoverUrl(candidate);

      expect(mockDeezerClient.searchAlbum).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("ABF-1k: returns null when searchAlbum throws", async () => {
      mockDeezerClient.searchAlbum.mockRejectedValue(new Error("network error"));

      const service = buildService();
      const candidate = makeCandidate({
        type: "album",
        cursorValue: "album:Radiohead:OK Computer",
        albumName: "OK Computer",
      });
      const result = await service.findAlbumCoverUrl(candidate);

      expect(result).toBeNull();
    });

    it("ABF-1l: returns null when album has no cover fields", async () => {
      mockDeezerClient.searchAlbum.mockResolvedValue({
        id: 99,
        title: "OK Computer",
      } satisfies DeezerAlbum);

      const service = buildService();
      const candidate = makeCandidate({
        type: "album",
        cursorValue: "album:Radiohead:OK Computer",
        albumName: "OK Computer",
      });
      const result = await service.findAlbumCoverUrl(candidate);

      expect(result).toBeNull();
    });
  });
});
