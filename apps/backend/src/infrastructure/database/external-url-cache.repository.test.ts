import { describe, expect, it, vi, beforeEach } from "vitest";
import { ExternalUrlCacheRepository } from "./external-url-cache.repository";

describe("ExternalUrlCacheRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("find", () => {
    it("returns the externalUrl when a row is found", async () => {
      const prisma = {
        externalUrlCache: {
          findFirst: vi
            .fn()
            .mockResolvedValue({ externalUrl: "https://open.spotify.com/track/abc" }),
        },
      } as any;

      const repo = new ExternalUrlCacheRepository(prisma);
      const result = await repo.find("spotify", "track", "abc123");

      expect(result).toBe("https://open.spotify.com/track/abc");
      expect(prisma.externalUrlCache.findFirst).toHaveBeenCalledWith({
        where: { provider: "spotify", type: "track", internalId: "abc123" },
        select: { externalUrl: true },
      });
    });

    it("returns null when no row is found", async () => {
      const prisma = {
        externalUrlCache: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      } as any;

      const repo = new ExternalUrlCacheRepository(prisma);
      const result = await repo.find("spotify", "album", "notfound");

      expect(result).toBeNull();
    });
  });

  describe("save", () => {
    it("calls upsert with correct where/create/update args", async () => {
      const prisma = {
        externalUrlCache: {
          upsert: vi.fn().mockResolvedValue(undefined),
        },
      } as any;

      const repo = new ExternalUrlCacheRepository(prisma);
      await repo.save({
        provider: "spotify",
        type: "track",
        internalId: "t1",
        name: "Song Title",
        artistName: "Artist Name",
        externalUrl: "https://spotify.com/t1",
      });

      expect(prisma.externalUrlCache.upsert).toHaveBeenCalledWith({
        where: {
          provider_type_internalId: { provider: "spotify", type: "track", internalId: "t1" },
        },
        create: {
          provider: "spotify",
          type: "track",
          internalId: "t1",
          name: "Song Title",
          artistName: "Artist Name",
          externalUrl: "https://spotify.com/t1",
        },
        update: {
          externalUrl: "https://spotify.com/t1",
          name: "Song Title",
          artistName: "Artist Name",
        },
      });
    });

    it("coalesces undefined name and artistName to null in create and update", async () => {
      const prisma = {
        externalUrlCache: {
          upsert: vi.fn().mockResolvedValue(undefined),
        },
      } as any;

      const repo = new ExternalUrlCacheRepository(prisma);
      await repo.save({
        provider: "spotify",
        type: "track",
        internalId: "t2",
        externalUrl: "https://spotify.com/t2",
      });

      const call = vi.mocked(prisma.externalUrlCache.upsert).mock.calls[0][0];
      expect(call.create.name).toBeNull();
      expect(call.create.artistName).toBeNull();
      expect(call.update.name).toBeNull();
      expect(call.update.artistName).toBeNull();
    });

    it("propagates upsert rejections", async () => {
      const prisma = {
        externalUrlCache: {
          upsert: vi.fn().mockRejectedValue(new Error("DB error")),
        },
      } as any;

      const repo = new ExternalUrlCacheRepository(prisma);
      await expect(
        repo.save({ provider: "spotify", type: "track", internalId: "t3", externalUrl: "url" }),
      ).rejects.toThrow("DB error");
    });
  });
});
