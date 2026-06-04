import { describe, expect, it, vi } from "vitest";
import { PlaylistCacheRepository } from "./playlist-cache.repository";

const makePrisma = (overrides: Partial<{ playlistCache: Record<string, unknown> }> = {}) =>
  ({
    playlistCache: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      ...overrides.playlistCache,
    },
  }) as any;

describe("PlaylistCacheRepository", () => {
  it("returns null when key is not present", async () => {
    const prisma = makePrisma({ playlistCache: { findUnique: vi.fn().mockResolvedValue(null) } });
    const repo = new PlaylistCacheRepository(prisma);
    await expect(repo.get("missing-key")).resolves.toBeNull();
  });

  it("returns null when entry is expired (expiresAt < now)", async () => {
    const past = new Date(Date.now() - 1000);
    const prisma = makePrisma({
      playlistCache: {
        findUnique: vi.fn().mockResolvedValue({
          cacheKey: "my-playlists:default",
          payload: JSON.stringify({ data: "stale" }),
          expiresAt: past,
        }),
      },
    });
    const repo = new PlaylistCacheRepository(prisma);
    await expect(repo.get("my-playlists:default")).resolves.toBeNull();
  });

  it("returns parsed payload when entry is fresh", async () => {
    const future = new Date(Date.now() + 86_400_000);
    const payload = { playlists: ["a", "b"] };
    const prisma = makePrisma({
      playlistCache: {
        findUnique: vi.fn().mockResolvedValue({
          cacheKey: "my-playlists:default",
          payload: JSON.stringify(payload),
          expiresAt: future,
        }),
      },
    });
    const repo = new PlaylistCacheRepository(prisma);
    await expect(repo.get("my-playlists:default")).resolves.toEqual(payload);
  });

  it("set() upserts with the correct key and expiresAt", async () => {
    const upsertMock = vi.fn().mockResolvedValue({});
    const prisma = makePrisma({ playlistCache: { upsert: upsertMock } });
    const repo = new PlaylistCacheRepository(prisma);
    const before = Date.now();
    await repo.set("my-playlists:default", { items: [] }, 86_400_000);
    const after = Date.now();

    expect(upsertMock).toHaveBeenCalledOnce();
    const call = upsertMock.mock.calls[0][0];
    expect(call.where.cacheKey).toBe("my-playlists:default");
    expect(JSON.parse(call.create.payload)).toEqual({ items: [] });
    const expiresAt: Date = call.create.expiresAt;
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 86_400_000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(after + 86_400_000);
  });

  it("invalidate() deletes the entry and swallows P2025", async () => {
    const deleteMock = vi.fn().mockRejectedValue({ code: "P2025" });
    const prisma = makePrisma({ playlistCache: { delete: deleteMock } });
    const repo = new PlaylistCacheRepository(prisma);
    await expect(repo.invalidate("my-playlists:default")).resolves.toBeUndefined();
    expect(deleteMock).toHaveBeenCalledWith({ where: { cacheKey: "my-playlists:default" } });
  });
});
