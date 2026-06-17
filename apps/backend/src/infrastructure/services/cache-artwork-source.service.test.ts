import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { CacheArtworkSourceService } from "./cache-artwork-source.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    followedArtistCache: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    artistAlbumCache: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    artistReleaseCache: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    track: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    playlist: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    ...overrides,
  } as any;
}

async function makeLibraryWith(...artistNames: string[]) {
  const root = await mkdtemp(join(tmpdir(), "spotiarr-artists-"));
  for (const name of artistNames) {
    await mkdir(join(root, name));
  }
  return root;
}

// ---------------------------------------------------------------------------
// getArtistCandidates
// ---------------------------------------------------------------------------

describe("CacheArtworkSourceService", () => {
  describe("getArtistCandidates", () => {
    it("uses library artist folders for artist candidates and applies cursor by artist name", async () => {
      const musicRoot = await makeLibraryWith("Artist A", "Artist B", "Artist C");

      const followedFindMany = vi.fn().mockResolvedValue([
        { name: "Artist B", spotifyId: "artist-b" },
        { name: "Artist C", spotifyId: "artist-c" },
      ]);
      const prisma = makePrisma({ followedArtistCache: { findMany: followedFindMany } });
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

    it("returns all sorted artists when no cursor is supplied", async () => {
      const musicRoot = await makeLibraryWith("Zorro", "Abbey", "Midway");

      const followedFindMany = vi
        .fn()
        .mockResolvedValue([{ name: "Abbey", spotifyId: "abbey-id" }]);
      const prisma = makePrisma({ followedArtistCache: { findMany: followedFindMany } });
      const pathPort = { getMusicLibraryPath: () => musicRoot } as any;

      const service = new CacheArtworkSourceService(prisma, pathPort);
      const rows = await service.getArtistCandidates(10);

      // All three folders returned, sorted case-insensitively
      expect(rows).toHaveLength(3);
      expect(rows.map((r) => r.artistName)).toEqual(["Abbey", "Midway", "Zorro"]);
    });

    it("returns null artistSpotifyId when artist has no entry in followed cache", async () => {
      const musicRoot = await makeLibraryWith("Unknown Artist");

      const followedFindMany = vi.fn().mockResolvedValue([]); // nothing in cache
      const prisma = makePrisma({ followedArtistCache: { findMany: followedFindMany } });
      const pathPort = { getMusicLibraryPath: () => musicRoot } as any;

      const service = new CacheArtworkSourceService(prisma, pathPort);
      const rows = await service.getArtistCandidates(10, null);

      expect(rows).toEqual([
        {
          type: "artist",
          cursorValue: "artist:Unknown Artist",
          artistName: "Unknown Artist",
          artistSpotifyId: null,
        },
      ]);
    });

    it("respects limit even without a cursor", async () => {
      const musicRoot = await makeLibraryWith("A", "B", "C", "D");

      const prisma = makePrisma({
        followedArtistCache: { findMany: vi.fn().mockResolvedValue([]) },
      });
      const pathPort = { getMusicLibraryPath: () => musicRoot } as any;

      const service = new CacheArtworkSourceService(prisma, pathPort);
      const rows = await service.getArtistCandidates(2);

      expect(rows).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // getAlbumCandidates
  // ---------------------------------------------------------------------------

  describe("getAlbumCandidates", () => {
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
        .mockResolvedValueOnce([{ spotifyId: "artist-a", name: "Artist A" }]);

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

    it("queries without cursor or skip when cursorValue is null", async () => {
      const albumFindMany = vi.fn().mockResolvedValue([]);
      const followedFindMany = vi.fn().mockResolvedValue([]);
      const prisma = makePrisma({
        artistAlbumCache: { findMany: albumFindMany, findUnique: vi.fn() },
        followedArtistCache: { findMany: followedFindMany },
      });
      const pathPort = { getMusicLibraryPath: () => "/music" } as any;

      const service = new CacheArtworkSourceService(prisma, pathPort);
      await service.getAlbumCandidates(5, null);

      expect(albumFindMany).toHaveBeenCalledWith({
        orderBy: { id: "asc" },
        take: 5,
      });
    });

    it("falls back to spotifyArtistId as artistName when artist not found in followed cache", async () => {
      const albumFindMany = vi.fn().mockResolvedValue([
        {
          id: "unknown-artist:album-x",
          spotifyArtistId: "unknown-artist",
          albumId: "album-x",
          albumName: "Some Album",
        },
      ]);
      const followedFindMany = vi.fn().mockResolvedValue([]); // artist not found

      const prisma = makePrisma({
        artistAlbumCache: { findMany: albumFindMany, findUnique: vi.fn() },
        followedArtistCache: { findMany: followedFindMany },
      });
      const pathPort = { getMusicLibraryPath: () => "/music" } as any;

      const service = new CacheArtworkSourceService(prisma, pathPort);
      const rows = await service.getAlbumCandidates(10, null);

      expect(rows[0].artistName).toBe("unknown-artist");
    });

    it("maps album rows to the correct candidate shape", async () => {
      const albumFindMany = vi.fn().mockResolvedValue([
        {
          id: "artist-1:album-1",
          spotifyArtistId: "artist-1",
          albumId: "album-1",
          albumName: "Great Album",
        },
      ]);
      const followedFindMany = vi
        .fn()
        .mockResolvedValue([{ spotifyId: "artist-1", name: "Great Artist" }]);

      const prisma = makePrisma({
        artistAlbumCache: { findMany: albumFindMany, findUnique: vi.fn() },
        followedArtistCache: { findMany: followedFindMany },
      });
      const pathPort = { getMusicLibraryPath: () => "/music" } as any;

      const service = new CacheArtworkSourceService(prisma, pathPort);
      const rows = await service.getAlbumCandidates(10, null);

      expect(rows).toEqual([
        {
          type: "album",
          cursorValue: "album:artist-1:album-1",
          artistName: "Great Artist",
          albumName: "Great Album",
          artistSpotifyId: "artist-1",
          albumSpotifyId: "album-1",
        },
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // findArtistImageUrl
  // ---------------------------------------------------------------------------

  describe("findArtistImageUrl", () => {
    const baseCandidate = {
      type: "artist" as const,
      cursorValue: "artist:Artist B",
      artistName: "Artist B",
    };

    it("uses persisted artist image metadata before playlist fallback (track primaryArtistImageUrl)", async () => {
      const prisma = makePrisma({
        followedArtistCache: {
          findUnique: vi.fn().mockResolvedValue(null),
          findMany: vi.fn().mockResolvedValue([]),
        },
      });
      prisma.track.findFirst.mockResolvedValueOnce({
        primaryArtistImageUrl: "https://img/artist.jpg",
      });
      const pathPort = { getMusicLibraryPath: () => "/music" } as any;

      const service = new CacheArtworkSourceService(prisma, pathPort);
      const image = await service.findArtistImageUrl({
        ...baseCandidate,
        artistSpotifyId: null,
      });

      expect(image).toBe("https://img/artist.jpg");
      expect(prisma.playlist.findFirst).not.toHaveBeenCalled();
    });

    it("returns imageUrl immediately when followedArtistCache has a direct hit", async () => {
      const prisma = makePrisma({
        followedArtistCache: {
          findUnique: vi.fn().mockResolvedValue({ imageUrl: "https://cdn/direct.jpg" }),
          findMany: vi.fn().mockResolvedValue([]),
        },
      });
      const pathPort = { getMusicLibraryPath: () => "/music" } as any;

      const service = new CacheArtworkSourceService(prisma, pathPort);
      const image = await service.findArtistImageUrl({
        ...baseCandidate,
        artistSpotifyId: "spotify-123",
      });

      expect(image).toBe("https://cdn/direct.jpg");
      expect(prisma.track.findFirst).not.toHaveBeenCalled();
    });

    it("falls through to track search when followedArtistCache.findUnique returns null", async () => {
      const prisma = makePrisma({
        followedArtistCache: {
          findUnique: vi.fn().mockResolvedValue(null),
          findMany: vi.fn().mockResolvedValue([]),
        },
      });
      prisma.track.findFirst.mockResolvedValueOnce({
        primaryArtistImageUrl: "https://img/track-artist.jpg",
      });
      const pathPort = { getMusicLibraryPath: () => "/music" } as any;

      const service = new CacheArtworkSourceService(prisma, pathPort);
      const image = await service.findArtistImageUrl({
        ...baseCandidate,
        artistSpotifyId: "spotify-456",
      });

      expect(image).toBe("https://img/track-artist.jpg");
    });

    it("falls through to albumFallback when trackArtistImage is not found", async () => {
      const prisma = makePrisma({
        followedArtistCache: {
          findUnique: vi.fn().mockResolvedValue(null),
          findMany: vi.fn().mockResolvedValue([]),
        },
      });
      prisma.track.findFirst
        .mockResolvedValueOnce(null) // primaryArtistImageUrl miss
        .mockResolvedValueOnce({ albumCoverUrl: "https://img/album-cover.jpg" }); // albumFallback hit
      const pathPort = { getMusicLibraryPath: () => "/music" } as any;

      const service = new CacheArtworkSourceService(prisma, pathPort);
      const image = await service.findArtistImageUrl({
        ...baseCandidate,
        artistSpotifyId: null,
      });

      expect(image).toBe("https://img/album-cover.jpg");
    });

    it("uses fuzzy match from followedArtistCache.findMany when both track lookups fail", async () => {
      const prisma = makePrisma({
        followedArtistCache: {
          findUnique: vi.fn().mockResolvedValue(null),
          findMany: vi
            .fn()
            .mockResolvedValue([{ name: "  Artist B  ", imageUrl: "https://img/fuzzy.jpg" }]),
        },
      });
      prisma.track.findFirst
        .mockResolvedValueOnce(null) // primaryArtistImageUrl miss
        .mockResolvedValueOnce(null); // albumFallback miss
      const pathPort = { getMusicLibraryPath: () => "/music" } as any;

      const service = new CacheArtworkSourceService(prisma, pathPort);
      const image = await service.findArtistImageUrl({
        ...baseCandidate,
        artistSpotifyId: null,
      });

      expect(image).toBe("https://img/fuzzy.jpg");
      expect(prisma.playlist.findFirst).not.toHaveBeenCalled();
    });

    it("falls through to playlist when fuzzy match returns nothing", async () => {
      const prisma = makePrisma({
        followedArtistCache: {
          findUnique: vi.fn().mockResolvedValue(null),
          findMany: vi
            .fn()
            .mockResolvedValue([{ name: "Some Other Artist", imageUrl: "https://img/other.jpg" }]),
        },
      });
      prisma.track.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      prisma.playlist.findFirst.mockResolvedValue({ artistImageUrl: "https://img/playlist.jpg" });
      const pathPort = { getMusicLibraryPath: () => "/music" } as any;

      const service = new CacheArtworkSourceService(prisma, pathPort);
      const image = await service.findArtistImageUrl({
        ...baseCandidate,
        artistSpotifyId: null,
      });

      expect(image).toBe("https://img/playlist.jpg");
    });

    it("returns null when all sources are exhausted", async () => {
      const prisma = makePrisma({
        followedArtistCache: {
          findUnique: vi.fn().mockResolvedValue(null),
          findMany: vi.fn().mockResolvedValue([]),
        },
      });
      prisma.track.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      prisma.playlist.findFirst.mockResolvedValue(null);
      const pathPort = { getMusicLibraryPath: () => "/music" } as any;

      const service = new CacheArtworkSourceService(prisma, pathPort);
      const image = await service.findArtistImageUrl({
        ...baseCandidate,
        artistSpotifyId: null,
      });

      expect(image).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findAlbumCoverUrl
  // ---------------------------------------------------------------------------

  describe("findAlbumCoverUrl", () => {
    const albumCandidate = {
      type: "album" as const,
      cursorValue: "album:artist-1:album-1",
      artistName: "Artist One",
      albumName: "Great Album",
      artistSpotifyId: "artist-1",
      albumSpotifyId: "album-1",
    };

    it("returns null immediately when candidate has no albumName", async () => {
      const prisma = makePrisma();
      const pathPort = { getMusicLibraryPath: () => "/music" } as any;

      const service = new CacheArtworkSourceService(prisma, pathPort);
      const result = await service.findAlbumCoverUrl({
        type: "artist",
        cursorValue: "artist:X",
        artistName: "X",
        albumName: undefined,
        artistSpotifyId: null,
        albumSpotifyId: null,
      });

      expect(result).toBeNull();
      expect(prisma.artistAlbumCache.findUnique).not.toHaveBeenCalled();
    });

    it("returns coverUrl from artistAlbumCache direct hit", async () => {
      const prisma = makePrisma({
        artistAlbumCache: {
          findMany: vi.fn().mockResolvedValue([]),
          findUnique: vi.fn().mockResolvedValue({ coverUrl: "https://img/album.jpg" }),
        },
      });
      const pathPort = { getMusicLibraryPath: () => "/music" } as any;

      const service = new CacheArtworkSourceService(prisma, pathPort);
      const result = await service.findAlbumCoverUrl(albumCandidate);

      expect(result).toBe("https://img/album.jpg");
      expect(prisma.track.findFirst).not.toHaveBeenCalled();
    });

    it("checks artistReleaseCache when artistAlbumCache returns null", async () => {
      const prisma = makePrisma({
        artistAlbumCache: {
          findMany: vi.fn().mockResolvedValue([]),
          findUnique: vi.fn().mockResolvedValue(null),
        },
        artistReleaseCache: {
          findUnique: vi.fn().mockResolvedValue({ coverUrl: "https://img/release.jpg" }),
        },
      });
      const pathPort = { getMusicLibraryPath: () => "/music" } as any;

      const service = new CacheArtworkSourceService(prisma, pathPort);
      const result = await service.findAlbumCoverUrl(albumCandidate);

      expect(result).toBe("https://img/release.jpg");
      expect(prisma.track.findFirst).not.toHaveBeenCalled();
    });

    it("falls through to track.findFirst when both cache tables return null", async () => {
      const prisma = makePrisma({
        artistAlbumCache: {
          findMany: vi.fn().mockResolvedValue([]),
          findUnique: vi.fn().mockResolvedValue(null),
        },
        artistReleaseCache: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      });
      prisma.track.findFirst.mockResolvedValue({ albumCoverUrl: "https://img/track-album.jpg" });
      const pathPort = { getMusicLibraryPath: () => "/music" } as any;

      const service = new CacheArtworkSourceService(prisma, pathPort);
      const result = await service.findAlbumCoverUrl(albumCandidate);

      expect(result).toBe("https://img/track-album.jpg");
    });

    it("goes straight to track.findFirst when no spotifyIds are present", async () => {
      const prisma = makePrisma({
        artistAlbumCache: {
          findMany: vi.fn().mockResolvedValue([]),
          findUnique: vi.fn(),
        },
      });
      prisma.track.findFirst.mockResolvedValue({ albumCoverUrl: "https://img/track-direct.jpg" });
      const pathPort = { getMusicLibraryPath: () => "/music" } as any;

      const service = new CacheArtworkSourceService(prisma, pathPort);
      const result = await service.findAlbumCoverUrl({
        ...albumCandidate,
        artistSpotifyId: null,
        albumSpotifyId: null,
      });

      expect(result).toBe("https://img/track-direct.jpg");
      expect(prisma.artistAlbumCache.findUnique).not.toHaveBeenCalled();
    });

    it("returns null when all sources miss", async () => {
      const prisma = makePrisma({
        artistAlbumCache: {
          findMany: vi.fn().mockResolvedValue([]),
          findUnique: vi.fn().mockResolvedValue(null),
        },
        artistReleaseCache: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      });
      prisma.track.findFirst.mockResolvedValue(null);
      const pathPort = { getMusicLibraryPath: () => "/music" } as any;

      const service = new CacheArtworkSourceService(prisma, pathPort);
      const result = await service.findAlbumCoverUrl(albumCandidate);

      expect(result).toBeNull();
    });
  });
});
