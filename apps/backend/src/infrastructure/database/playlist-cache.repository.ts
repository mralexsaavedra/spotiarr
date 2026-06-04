import type { PrismaClient } from "@prisma/client";
import type { PlaylistCachePort } from "@/application/ports/playlist-cache.port";

const isPrismaNotFoundError = (e: unknown): boolean =>
  typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2025";

export class PlaylistCacheRepository implements PlaylistCachePort {
  constructor(private readonly prisma: PrismaClient) {}

  async get<T>(key: string): Promise<T | null> {
    const row = await this.prisma.playlistCache.findUnique({ where: { cacheKey: key } });
    if (!row) return null;
    if (row.expiresAt < new Date()) return null;
    return JSON.parse(row.payload) as T;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlMs);
    const payload = JSON.stringify(value);
    await this.prisma.playlistCache.upsert({
      where: { cacheKey: key },
      create: { cacheKey: key, payload, expiresAt },
      update: { payload, expiresAt, cachedAt: new Date() },
    });
  }

  async invalidate(key: string): Promise<void> {
    try {
      await this.prisma.playlistCache.delete({ where: { cacheKey: key } });
    } catch (e) {
      if (!isPrismaNotFoundError(e)) throw e;
    }
  }
}
