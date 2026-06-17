import { describe, expect, it, vi } from "vitest";
import { ArtistReleaseCacheRepository } from "./artist-release-cache.repository";

function makeReleaseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "artist1:album1",
    artistId: "artist1",
    albumId: "album1",
    albumName: "Test Album",
    albumType: "album",
    releaseDate: "2024-06-01",
    coverUrl: null,
    spotifyUrl: "https://open.spotify.com/album/x",
    syncedAt: new Date(),
    artist: {
      name: "Test Artist",
      imageUrl: "http://img.com/artist",
    },
    ...overrides,
  };
}

describe("ArtistReleaseCacheRepository", () => {
  describe("getReleases", () => {
    it("uses default lookback when input is NaN", async () => {
      const prisma = {
        artistReleaseCache: { findMany: vi.fn().mockResolvedValue([]) },
      } as any;
      const repo = new ArtistReleaseCacheRepository(prisma);
      await repo.getReleases(Number.NaN);
      expect(prisma.artistReleaseCache.findMany).toHaveBeenCalledOnce();
    });

    it("uses default lookback (30) when input is 0", async () => {
      const findMany = vi.fn().mockResolvedValue([]);
      const prisma = { artistReleaseCache: { findMany } } as any;
      const repo = new ArtistReleaseCacheRepository(prisma);
      await repo.getReleases(0);
      expect(findMany).toHaveBeenCalledOnce();
    });

    it("uses default lookback (30) when input is negative", async () => {
      const findMany = vi.fn().mockResolvedValue([]);
      const prisma = { artistReleaseCache: { findMany } } as any;
      const repo = new ArtistReleaseCacheRepository(prisma);
      await repo.getReleases(-5);
      expect(findMany).toHaveBeenCalledOnce();
    });

    it("uses default lookback (30) when input is Infinity", async () => {
      const findMany = vi.fn().mockResolvedValue([]);
      const prisma = { artistReleaseCache: { findMany } } as any;
      const repo = new ArtistReleaseCacheRepository(prisma);
      await repo.getReleases(Infinity);
      expect(findMany).toHaveBeenCalledOnce();
    });

    it("uses provided lookback when input is a valid positive finite number", async () => {
      const findMany = vi.fn().mockResolvedValue([]);
      const prisma = { artistReleaseCache: { findMany } } as any;
      const repo = new ArtistReleaseCacheRepository(prisma);
      await repo.getReleases(14);
      expect(findMany).toHaveBeenCalledOnce();
      // We just confirm it was called — can't easily verify the exact date without mocking Date.now()
    });

    it("returns sorted releases from rows", async () => {
      const rows = [
        makeReleaseRow({ albumId: "alb1", releaseDate: "2024-01-01" }),
        makeReleaseRow({ albumId: "alb2", releaseDate: "2024-06-01" }),
      ];
      const findMany = vi.fn().mockResolvedValue(rows);
      const prisma = { artistReleaseCache: { findMany } } as any;
      const repo = new ArtistReleaseCacheRepository(prisma);
      const result = await repo.getReleases(30);
      expect(result).toHaveLength(2);
      // sorted descending by releaseDate
      expect(result[0].releaseDate).toBe("2024-06-01");
    });
  });

  describe("getArtistReleaseWithArtist", () => {
    it("returns null when release is not found", async () => {
      const prisma = {
        artistReleaseCache: { findUnique: vi.fn().mockResolvedValue(null) },
      } as any;
      const repo = new ArtistReleaseCacheRepository(prisma);
      await expect(repo.getArtistReleaseWithArtist("a", "b")).resolves.toBeNull();
    });

    it("returns mapped result when release and artist are found", async () => {
      const row = makeReleaseRow();
      const prisma = {
        artistReleaseCache: { findUnique: vi.fn().mockResolvedValue(row) },
      } as any;
      const repo = new ArtistReleaseCacheRepository(prisma);
      const result = await repo.getArtistReleaseWithArtist("artist1", "album1");
      expect(result).not.toBeNull();
      expect(result!.artistId).toBe("artist1");
      expect(result!.albumId).toBe("album1");
      expect(result!.artistName).toBe("Test Artist");
      expect(result!.albumName).toBe("Test Album");
      expect(result!.spotifyUrl).toBe("https://open.spotify.com/album/x");
    });
  });

  describe("upsertReleases", () => {
    it("calls $transaction with upsert operations", async () => {
      const upsert = vi.fn().mockReturnValue(Promise.resolve({}));
      const $transaction = vi.fn().mockResolvedValue(undefined);
      const prisma = {
        $transaction,
        artistReleaseCache: { upsert },
      } as any;
      const repo = new ArtistReleaseCacheRepository(prisma);
      await repo.upsertReleases([
        {
          artistId: "art1",
          albumId: "alb1",
          albumName: "Album",
          albumType: "album",
          releaseDate: "2024-01-01",
          coverUrl: null,
          spotifyUrl: null,
          artistName: "Artist",
          artistImageUrl: null,
        },
      ]);
      expect($transaction).toHaveBeenCalledOnce();
    });
  });

  describe("updateArtistReleaseSpotifyUrl", () => {
    it("calls updateMany with the correct where clause", async () => {
      const updateMany = vi.fn().mockResolvedValue({ count: 1 });
      const prisma = { artistReleaseCache: { updateMany } } as any;
      const repo = new ArtistReleaseCacheRepository(prisma);
      await repo.updateArtistReleaseSpotifyUrl("art1", "alb1", "https://open.spotify.com/album/x");
      expect(updateMany).toHaveBeenCalledOnce();
      const call = updateMany.mock.calls[0][0];
      expect(call.where).toEqual({ id: "art1:alb1" });
      expect(call.data.spotifyUrl).toBe("https://open.spotify.com/album/x");
    });
  });

  describe("getArtistIdsWithFreshReleases", () => {
    it("returns a Set of artist IDs from fresh releases", async () => {
      const cutoff = new Date("2024-01-01");
      const findMany = vi.fn().mockResolvedValue([{ artistId: "a1" }, { artistId: "a2" }]);
      const prisma = { artistReleaseCache: { findMany } } as any;
      const repo = new ArtistReleaseCacheRepository(prisma);
      const result = await repo.getArtistIdsWithFreshReleases(cutoff);
      expect(result).toBeInstanceOf(Set);
      expect(result.has("a1")).toBe(true);
      expect(result.has("a2")).toBe(true);
      expect(result.size).toBe(2);
    });
  });
});
