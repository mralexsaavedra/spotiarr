import { describe, expect, it, vi } from "vitest";
import { ArtistAlbumCacheRepository } from "./artist-album-cache.repository";

describe("ArtistAlbumCacheRepository", () => {
  it("returns freshness date when found", async () => {
    const now = new Date();
    const prisma = {
      artistAlbumCache: { findFirst: vi.fn().mockResolvedValue({ syncedAt: now }) },
    } as any;
    const repo = new ArtistAlbumCacheRepository(prisma);
    await expect(repo.getArtistAlbumsFreshness("a1")).resolves.toEqual(now);
  });

  it("returns null freshness when no row found", async () => {
    const prisma = {
      artistAlbumCache: { findFirst: vi.fn().mockResolvedValue(null) },
    } as any;
    const repo = new ArtistAlbumCacheRepository(prisma);
    await expect(repo.getArtistAlbumsFreshness("a1")).resolves.toBeNull();
  });

  it("short-circuits empty album upserts", async () => {
    const prisma = { $transaction: vi.fn() } as any;
    const repo = new ArtistAlbumCacheRepository(prisma);
    await repo.upsertArtistAlbums([]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  describe("getArtistAlbumWithArtist", () => {
    it("returns null when album row not found", async () => {
      const prisma = {
        artistAlbumCache: { findUnique: vi.fn().mockResolvedValue(null) },
      } as any;
      const repo = new ArtistAlbumCacheRepository(prisma);
      await expect(repo.getArtistAlbumWithArtist("artist1", "album1")).resolves.toBeNull();
    });

    it("returns row with artistName when artist found", async () => {
      const albumRow = {
        id: "artist1:album1",
        spotifyArtistId: "artist1",
        albumId: "album1",
        albumName: "My Album",
        albumType: "album",
        releaseDate: "2024-01-01",
        coverUrl: null,
        spotifyUrl: null,
        totalTracks: 10,
        syncedAt: new Date(),
        deezerAlbumId: null,
        mbAlbumId: null,
      };
      const prisma = {
        artistAlbumCache: { findUnique: vi.fn().mockResolvedValue(albumRow) },
        followedArtistCache: { findUnique: vi.fn().mockResolvedValue({ name: "Test Artist" }) },
      } as any;
      const repo = new ArtistAlbumCacheRepository(prisma);
      const result = await repo.getArtistAlbumWithArtist("artist1", "album1");
      expect(result).not.toBeNull();
      expect(result!.artistName).toBe("Test Artist");
    });

    it("falls back to 'Unknown Artist' when artist row not found", async () => {
      const albumRow = {
        id: "artist1:album1",
        spotifyArtistId: "artist1",
        albumId: "album1",
        albumName: "My Album",
        albumType: "album",
        releaseDate: "2024-01-01",
        coverUrl: null,
        spotifyUrl: null,
        totalTracks: null,
        syncedAt: new Date(),
        deezerAlbumId: null,
        mbAlbumId: null,
      };
      const prisma = {
        artistAlbumCache: { findUnique: vi.fn().mockResolvedValue(albumRow) },
        followedArtistCache: { findUnique: vi.fn().mockResolvedValue(null) },
      } as any;
      const repo = new ArtistAlbumCacheRepository(prisma);
      const result = await repo.getArtistAlbumWithArtist("artist1", "album1");
      expect(result!.artistName).toBe("Unknown Artist");
    });
  });

  describe("upsertArtistAlbumSpotifyUrl", () => {
    it("calls upsert with totalTracks when provided", async () => {
      const upsert = vi.fn().mockResolvedValue(undefined);
      const prisma = { artistAlbumCache: { upsert } } as any;
      const repo = new ArtistAlbumCacheRepository(prisma);
      await repo.upsertArtistAlbumSpotifyUrl({
        artistId: "art1",
        albumId: "alb1",
        albumName: "Album",
        albumType: "album",
        releaseDate: "2024-01-01",
        coverUrl: null,
        spotifyUrl: "https://open.spotify.com/album/alb1",
        totalTracks: 12,
      });
      expect(upsert).toHaveBeenCalledOnce();
      const call = upsert.mock.calls[0][0];
      expect(call.update.totalTracks).toBe(12);
      expect(call.create.totalTracks).toBe(12);
    });

    it("uses undefined in update and null in create when totalTracks is null", async () => {
      const upsert = vi.fn().mockResolvedValue(undefined);
      const prisma = { artistAlbumCache: { upsert } } as any;
      const repo = new ArtistAlbumCacheRepository(prisma);
      await repo.upsertArtistAlbumSpotifyUrl({
        artistId: "art1",
        albumId: "alb1",
        albumName: "Album",
        albumType: "album",
        releaseDate: "2024-01-01",
        coverUrl: null,
        spotifyUrl: "https://open.spotify.com/album/alb1",
        totalTracks: null,
      });
      expect(upsert).toHaveBeenCalledOnce();
      const call = upsert.mock.calls[0][0];
      // null ?? undefined = undefined in update
      expect(call.update.totalTracks).toBeUndefined();
      // null ?? null = null in create
      expect(call.create.totalTracks).toBeNull();
    });
  });

  describe("updateArtistAlbumIdentities", () => {
    it("updates both deezerAlbumId and mbAlbumId when both provided", async () => {
      const update = vi.fn().mockResolvedValue(undefined);
      const prisma = { artistAlbumCache: { update } } as any;
      const repo = new ArtistAlbumCacheRepository(prisma);
      await repo.updateArtistAlbumIdentities("id1", { deezerAlbumId: "d1", mbAlbumId: "mb1" });
      const call = update.mock.calls[0][0];
      expect(call.data).toMatchObject({ deezerAlbumId: "d1", mbAlbumId: "mb1" });
    });

    it("updates only deezerAlbumId when mbAlbumId is undefined", async () => {
      const update = vi.fn().mockResolvedValue(undefined);
      const prisma = { artistAlbumCache: { update } } as any;
      const repo = new ArtistAlbumCacheRepository(prisma);
      await repo.updateArtistAlbumIdentities("id1", { deezerAlbumId: "d1" });
      const call = update.mock.calls[0][0];
      expect(call.data).toMatchObject({ deezerAlbumId: "d1" });
      expect(call.data.mbAlbumId).toBeUndefined();
    });

    it("updates only mbAlbumId when deezerAlbumId is undefined", async () => {
      const update = vi.fn().mockResolvedValue(undefined);
      const prisma = { artistAlbumCache: { update } } as any;
      const repo = new ArtistAlbumCacheRepository(prisma);
      await repo.updateArtistAlbumIdentities("id1", { mbAlbumId: "mb1" });
      const call = update.mock.calls[0][0];
      expect(call.data).toMatchObject({ mbAlbumId: "mb1" });
      expect(call.data.deezerAlbumId).toBeUndefined();
    });

    it("calls update with empty data when neither identity provided", async () => {
      const update = vi.fn().mockResolvedValue(undefined);
      const prisma = { artistAlbumCache: { update } } as any;
      const repo = new ArtistAlbumCacheRepository(prisma);
      await repo.updateArtistAlbumIdentities("id1", {});
      expect(update).toHaveBeenCalledOnce();
    });
  });

  describe("getArtistAlbumCount", () => {
    it("returns count for the given artist", async () => {
      const count = vi.fn().mockResolvedValue(5);
      const prisma = { artistAlbumCache: { count } } as any;
      const repo = new ArtistAlbumCacheRepository(prisma);
      await expect(repo.getArtistAlbumCount("artist1")).resolves.toBe(5);
      expect(count).toHaveBeenCalledWith({ where: { spotifyArtistId: "artist1" } });
    });
  });

  describe("getArtistIdsWithFreshAlbums", () => {
    it("returns a Set of artist IDs from fresh albums", async () => {
      const cutoff = new Date("2024-01-01");
      const findMany = vi
        .fn()
        .mockResolvedValue([{ spotifyArtistId: "a1" }, { spotifyArtistId: "a2" }]);
      const prisma = { artistAlbumCache: { findMany } } as any;
      const repo = new ArtistAlbumCacheRepository(prisma);
      const result = await repo.getArtistIdsWithFreshAlbums(cutoff);
      expect(result).toBeInstanceOf(Set);
      expect(result.has("a1")).toBe(true);
      expect(result.has("a2")).toBe(true);
      expect(result.size).toBe(2);
    });
  });

  describe("getArtistAlbums", () => {
    const makeAlbumRow = () => ({
      spotifyArtistId: "artist1",
      albumId: "alb1",
      albumName: "Album 1",
      albumType: "album",
      releaseDate: "2024-01-01",
      coverUrl: null,
      spotifyUrl: null,
      totalTracks: null,
      syncedAt: new Date(),
      id: "artist1:alb1",
      deezerAlbumId: null,
      mbAlbumId: null,
    });

    it("maps albums with artist metadata when artist found", async () => {
      const artistRow = { spotifyId: "artist1", name: "Artist One", imageUrl: "http://img.com/a" };
      const findMany = vi.fn().mockResolvedValue([makeAlbumRow()]);
      const findUnique = vi.fn().mockResolvedValue(artistRow);
      const prisma = {
        artistAlbumCache: { findMany },
        followedArtistCache: { findUnique },
      } as any;
      const repo = new ArtistAlbumCacheRepository(prisma);
      const result = await repo.getArtistAlbums("artist1", 10);
      expect(result).toHaveLength(1);
      expect(result[0].artistName).toBe("Artist One");
      expect(result[0].artistImageUrl).toBe("http://img.com/a");
    });

    it("uses undefined artistMeta when artist not found (artistName falls back to Unknown Artist)", async () => {
      const findMany = vi.fn().mockResolvedValue([makeAlbumRow()]);
      const findUnique = vi.fn().mockResolvedValue(null);
      const prisma = {
        artistAlbumCache: { findMany },
        followedArtistCache: { findUnique },
      } as any;
      const repo = new ArtistAlbumCacheRepository(prisma);
      const result = await repo.getArtistAlbums("artist1", 10, 5);
      expect(result).toHaveLength(1);
      expect(result[0].artistName).toBe("Unknown Artist");
    });
  });

  describe("upsertArtistAlbums", () => {
    it("calls $transaction for non-empty album array", async () => {
      const upsert = vi.fn().mockReturnValue(Promise.resolve({}));
      const $transaction = vi.fn().mockResolvedValue(undefined);
      const prisma = {
        $transaction,
        artistAlbumCache: { upsert },
      } as any;
      const repo = new ArtistAlbumCacheRepository(prisma);
      await repo.upsertArtistAlbums([
        {
          artistId: "art1",
          albumId: "alb1",
          albumName: "Album",
          albumType: "album",
          releaseDate: "2024-01-01",
          coverUrl: null,
          spotifyUrl: null,
          totalTracks: null,
          artistName: "Artist",
          artistImageUrl: null,
        },
      ]);
      expect($transaction).toHaveBeenCalledOnce();
    });
  });
});
