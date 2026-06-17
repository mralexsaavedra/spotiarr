import { describe, expect, it, vi } from "vitest";
import { FollowedArtistRepository } from "./followed-artist.repository";

// isSpotifyArtistId = /^[0-9A-Za-z]{22}$/ — exactly 22 alphanumeric chars
// isDeezerArtistId  = /^\d+$/             — digits only
const SPOTIFY_ID = "0TnOYISbd1XYRBk9myaseg"; // 22 alphanum chars
const DEEZER_ID = "123456789";

function makeArtistRow(overrides: Record<string, unknown> = {}) {
  return {
    spotifyId: SPOTIFY_ID,
    name: "Test Artist",
    imageUrl: "http://img.com/artist",
    spotifyUrl: "https://open.spotify.com/artist/xxx",
    deezerId: DEEZER_ID,
    mbid: "mb-001",
    lastCatalogSyncAt: null,
    lastReleasesSyncAt: null,
    syncedAt: new Date(),
    ...overrides,
  };
}

describe("FollowedArtistRepository", () => {
  it("returns empty identities for empty input", async () => {
    const prisma = { followedArtistCache: { findMany: vi.fn() } } as any;
    const repo = new FollowedArtistRepository(prisma);
    const result = await repo.getArtistCatalogIdentities([]);
    expect(result).toEqual([]);
    expect(prisma.followedArtistCache.findMany).not.toHaveBeenCalled();
  });

  it("updates identities transactionally", async () => {
    const prisma = {
      $transaction: vi.fn().mockResolvedValue(undefined),
      followedArtistCache: { update: vi.fn().mockReturnValue(Promise.resolve()) },
    } as any;
    const repo = new FollowedArtistRepository(prisma);
    await repo.updateArtistCatalogIdentities([{ spotifyId: "a1", deezerId: "d1" }]);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  describe("getArtistBySpotifyId", () => {
    it("returns null when artist not found", async () => {
      const prisma = {
        followedArtistCache: { findUnique: vi.fn().mockResolvedValue(null) },
      } as any;
      const repo = new FollowedArtistRepository(prisma);
      await expect(repo.getArtistBySpotifyId(SPOTIFY_ID)).resolves.toBeNull();
    });

    it("maps row to FollowedArtist when found", async () => {
      const prisma = {
        followedArtistCache: { findUnique: vi.fn().mockResolvedValue(makeArtistRow()) },
      } as any;
      const repo = new FollowedArtistRepository(prisma);
      const result = await repo.getArtistBySpotifyId(SPOTIFY_ID);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(SPOTIFY_ID);
      expect(result!.name).toBe("Test Artist");
      expect(result!.image).toBe("http://img.com/artist");
      expect(result!.spotifyUrl).toBe("https://open.spotify.com/artist/xxx");
    });

    it("maps null imageUrl and spotifyUrl to null in result", async () => {
      const prisma = {
        followedArtistCache: {
          findUnique: vi
            .fn()
            .mockResolvedValue(makeArtistRow({ imageUrl: null, spotifyUrl: null })),
        },
      } as any;
      const repo = new FollowedArtistRepository(prisma);
      const result = await repo.getArtistBySpotifyId(SPOTIFY_ID);
      expect(result!.image).toBeNull();
      expect(result!.spotifyUrl).toBeNull();
    });
  });

  describe("getArtistByAnyId", () => {
    it("delegates to getArtistBySpotifyId for a Spotify ID", async () => {
      const findUnique = vi.fn().mockResolvedValue(makeArtistRow());
      const prisma = { followedArtistCache: { findUnique } } as any;
      const repo = new FollowedArtistRepository(prisma);
      const result = await repo.getArtistByAnyId(SPOTIFY_ID);
      expect(findUnique).toHaveBeenCalledOnce();
      expect(result!.id).toBe(SPOTIFY_ID);
    });

    it("looks up by deezerId when id is a Deezer ID (digits only)", async () => {
      const findFirst = vi.fn().mockResolvedValue(makeArtistRow());
      const prisma = { followedArtistCache: { findFirst } } as any;
      const repo = new FollowedArtistRepository(prisma);
      const result = await repo.getArtistByAnyId(DEEZER_ID);
      expect(findFirst).toHaveBeenCalledWith({ where: { deezerId: DEEZER_ID } });
      expect(result!.id).toBe(SPOTIFY_ID);
    });

    it("returns null when Deezer lookup finds nothing", async () => {
      const findFirst = vi.fn().mockResolvedValue(null);
      const prisma = { followedArtistCache: { findFirst } } as any;
      const repo = new FollowedArtistRepository(prisma);
      await expect(repo.getArtistByAnyId(DEEZER_ID)).resolves.toBeNull();
    });

    it("returns null when id matches neither Spotify nor Deezer format", async () => {
      const prisma = { followedArtistCache: { findUnique: vi.fn(), findFirst: vi.fn() } } as any;
      const repo = new FollowedArtistRepository(prisma);
      // short id with hyphens — not spotify (needs 22 alphanum) and not digits only
      await expect(repo.getArtistByAnyId("not-a-valid-id")).resolves.toBeNull();
      expect(prisma.followedArtistCache.findUnique).not.toHaveBeenCalled();
      expect(prisma.followedArtistCache.findFirst).not.toHaveBeenCalled();
    });
  });

  describe("getArtistCatalogIdentities (non-empty)", () => {
    it("returns identities for a non-empty input, mapping missing rows to null", async () => {
      const rows = [{ spotifyId: "id1", deezerId: "d1", mbid: "mb1" }];
      const prisma = {
        followedArtistCache: { findMany: vi.fn().mockResolvedValue(rows) },
      } as any;
      const repo = new FollowedArtistRepository(prisma);
      // id1 is in the map, id2 is missing
      const result = await repo.getArtistCatalogIdentities(["id1", "id2"]);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ spotifyId: "id1", deezerId: "d1", mbid: "mb1" });
      expect(result[1]).toEqual({ spotifyId: "id2", deezerId: null, mbid: null });
    });
  });

  describe("updateArtistCatalogIdentities (empty)", () => {
    it("returns immediately without calling $transaction for empty array", async () => {
      const $transaction = vi.fn();
      const prisma = { $transaction } as any;
      const repo = new FollowedArtistRepository(prisma);
      await repo.updateArtistCatalogIdentities([]);
      expect($transaction).not.toHaveBeenCalled();
    });
  });

  describe("getArtists", () => {
    it("returns mapped artists from findMany", async () => {
      const rows = [
        makeArtistRow({ spotifyId: "s1", name: "Artist A" }),
        makeArtistRow({ spotifyId: "s2", name: "Artist B", imageUrl: null, spotifyUrl: null }),
      ];
      const prisma = {
        followedArtistCache: { findMany: vi.fn().mockResolvedValue(rows) },
      } as any;
      const repo = new FollowedArtistRepository(prisma);
      const result = await repo.getArtists();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("s1");
      expect(result[1].image).toBeNull();
    });
  });

  describe("upsertArtists", () => {
    it("calls $transaction with upsert operations", async () => {
      const upsert = vi.fn().mockReturnValue(Promise.resolve({}));
      const $transaction = vi.fn().mockResolvedValue(undefined);
      const prisma = {
        $transaction,
        followedArtistCache: { upsert },
      } as any;
      const repo = new FollowedArtistRepository(prisma);
      await repo.upsertArtists([{ id: SPOTIFY_ID, name: "Artist", image: null, spotifyUrl: null }]);
      expect($transaction).toHaveBeenCalledOnce();
    });
  });

  describe("getArtistIdsWithNoAlbums", () => {
    it("returns artist IDs that have no albums", async () => {
      const prisma = {
        followedArtistCache: {
          findMany: vi.fn().mockResolvedValue([{ spotifyId: "a1" }, { spotifyId: "a2" }]),
        },
        artistAlbumCache: {
          findMany: vi.fn().mockResolvedValue([{ spotifyArtistId: "a2" }]),
        },
      } as any;
      const repo = new FollowedArtistRepository(prisma);
      const result = await repo.getArtistIdsWithNoAlbums();
      expect(result).toBeInstanceOf(Set);
      expect(result.has("a1")).toBe(true);
      expect(result.has("a2")).toBe(false);
    });
  });

  describe("getArtistIdsNeedingCatalogSync", () => {
    it("returns spotifyIds from matching rows", async () => {
      const cutoff = new Date("2024-01-01");
      const rows = [{ spotifyId: "s1" }, { spotifyId: "s2" }];
      const prisma = {
        followedArtistCache: { findMany: vi.fn().mockResolvedValue(rows) },
      } as any;
      const repo = new FollowedArtistRepository(prisma);
      const result = await repo.getArtistIdsNeedingCatalogSync(cutoff, 10);
      expect(result).toEqual(["s1", "s2"]);
    });
  });

  describe("updateArtistCatalogSyncedAt", () => {
    it("returns immediately for empty array without $transaction", async () => {
      const $transaction = vi.fn();
      const prisma = { $transaction } as any;
      const repo = new FollowedArtistRepository(prisma);
      await repo.updateArtistCatalogSyncedAt([]);
      expect($transaction).not.toHaveBeenCalled();
    });

    it("calls $transaction for non-empty array", async () => {
      const update = vi.fn().mockReturnValue(Promise.resolve({}));
      const $transaction = vi.fn().mockResolvedValue(undefined);
      const prisma = {
        $transaction,
        followedArtistCache: { update },
      } as any;
      const repo = new FollowedArtistRepository(prisma);
      await repo.updateArtistCatalogSyncedAt(["s1", "s2"]);
      expect($transaction).toHaveBeenCalledOnce();
    });
  });

  describe("updateArtistReleasesSyncedAt", () => {
    it("returns immediately for empty array without $transaction", async () => {
      const $transaction = vi.fn();
      const prisma = { $transaction } as any;
      const repo = new FollowedArtistRepository(prisma);
      await repo.updateArtistReleasesSyncedAt([]);
      expect($transaction).not.toHaveBeenCalled();
    });

    it("calls $transaction for non-empty array", async () => {
      const update = vi.fn().mockReturnValue(Promise.resolve({}));
      const $transaction = vi.fn().mockResolvedValue(undefined);
      const prisma = {
        $transaction,
        followedArtistCache: { update },
      } as any;
      const repo = new FollowedArtistRepository(prisma);
      await repo.updateArtistReleasesSyncedAt(["s1"]);
      expect($transaction).toHaveBeenCalledOnce();
    });
  });

  describe("getActiveArtistIdsForReleasesSync", () => {
    it("returns spotifyIds from matching rows", async () => {
      const releaseCutoff = new Date("2024-06-01");
      const activityWindowDate = new Date("2023-01-01");
      const rows = [{ spotifyId: "s1" }, { spotifyId: "s2" }];
      const prisma = {
        followedArtistCache: { findMany: vi.fn().mockResolvedValue(rows) },
      } as any;
      const repo = new FollowedArtistRepository(prisma);
      const result = await repo.getActiveArtistIdsForReleasesSync(
        releaseCutoff,
        activityWindowDate,
        5,
      );
      expect(result).toEqual(["s1", "s2"]);
    });
  });
});
