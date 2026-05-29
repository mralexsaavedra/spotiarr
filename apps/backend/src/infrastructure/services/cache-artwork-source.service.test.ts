import { describe, expect, it, vi } from "vitest";
import { CacheArtworkSourceService } from "./cache-artwork-source.service";

describe("CacheArtworkSourceService pagination", () => {
  it("uses artist cursor contract aligned with ordering", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = {
      followedArtistCache: { findMany },
      artistAlbumCache: { findMany: vi.fn() },
      track: { findFirst: vi.fn() },
      playlist: { findFirst: vi.fn() },
      artistReleaseCache: { findUnique: vi.fn() },
    } as any;

    const service = new CacheArtworkSourceService(prisma);
    await service.getArtistCandidates(10, "artist:artist-a");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { spotifyId: "asc" },
        cursor: { spotifyId: "artist-a" },
        skip: 1,
      }),
    );
  });

  it("uses album cursor contract aligned with ordering", async () => {
    const albumFindMany = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: "artist-a:album-a",
          spotifyArtistId: "artist-a",
          albumId: "album-a",
          albumName: "Album A",
        },
      ])
      .mockResolvedValueOnce([
        {
          spotifyId: "artist-a",
          name: "Artist A",
        },
      ]);
    const prisma = {
      followedArtistCache: { findMany: albumFindMany },
      artistAlbumCache: { findMany: albumFindMany, findUnique: vi.fn() },
      track: { findFirst: vi.fn() },
      playlist: { findFirst: vi.fn() },
      artistReleaseCache: { findUnique: vi.fn() },
    } as any;

    const service = new CacheArtworkSourceService(prisma);
    const rows = await service.getAlbumCandidates(10, "album:artist-a:album-a");

    expect(prisma.artistAlbumCache.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { id: "asc" },
        cursor: { id: "artist-a:album-a" },
        skip: 1,
      }),
    );
    expect(rows[0].cursorValue).toBe("album:artist-a:album-a");
  });
});
