import { describe, expect, it, vi } from "vitest";
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
  });
});
