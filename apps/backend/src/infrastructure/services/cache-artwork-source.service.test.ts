import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { CacheArtworkSourceService } from "./cache-artwork-source.service";

describe("CacheArtworkSourceService pagination", () => {
  it("uses library artist folders for artist candidates and applies cursor by artist name", async () => {
    const musicRoot = await mkdtemp(join(tmpdir(), "spotiarr-artists-"));
    await mkdir(join(musicRoot, "Artist A"));
    await mkdir(join(musicRoot, "Artist B"));
    await mkdir(join(musicRoot, "Artist C"));

    const followedFindMany = vi.fn().mockResolvedValue([
      { name: "Artist B", spotifyId: "artist-b" },
      { name: "Artist C", spotifyId: "artist-c" },
    ]);
    const prisma = {
      followedArtistCache: { findMany: followedFindMany },
      artistAlbumCache: { findMany: vi.fn() },
      track: { findFirst: vi.fn() },
      playlist: { findFirst: vi.fn() },
      artistReleaseCache: { findUnique: vi.fn() },
    } as any;
    const pathPort = { getMusicLibraryPath: () => musicRoot } as any;

    const service = new CacheArtworkSourceService(prisma, pathPort);
    const rows = await service.getArtistCandidates(10, "artist:Artist A");

    expect(followedFindMany).toHaveBeenCalledWith({
      where: { name: { in: ["Artist B", "Artist C"] } },
      select: { name: true, spotifyId: true },
    });
    expect(rows).toEqual([
      {
        type: "artist",
        cursorValue: "artist:Artist B",
        artistName: "Artist B",
        artistSpotifyId: "artist-b",
      },
      {
        type: "artist",
        cursorValue: "artist:Artist C",
        artistName: "Artist C",
        artistSpotifyId: "artist-c",
      },
    ]);
  });

  it("uses persisted artist image metadata before playlist fallback", async () => {
    const prisma = {
      followedArtistCache: {
        findUnique: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      artistAlbumCache: { findMany: vi.fn() },
      track: { findFirst: vi.fn() },
      playlist: { findFirst: vi.fn() },
      artistReleaseCache: { findUnique: vi.fn() },
    } as any;
    prisma.track.findFirst.mockResolvedValueOnce({
      primaryArtistImageUrl: "https://img/artist.jpg",
    });
    const pathPort = { getMusicLibraryPath: () => "/music" } as any;

    const service = new CacheArtworkSourceService(prisma, pathPort);
    const image = await service.findArtistImageUrl({
      type: "artist",
      cursorValue: "artist:Artist B",
      artistName: "Artist B",
      artistSpotifyId: null,
    });

    expect(image).toBe("https://img/artist.jpg");
    expect(prisma.playlist.findFirst).not.toHaveBeenCalled();
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

    const pathPort = { getMusicLibraryPath: () => "/music" } as any;

    const service = new CacheArtworkSourceService(prisma, pathPort);
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
