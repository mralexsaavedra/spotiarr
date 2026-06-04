import type { PrismaClient } from "@prisma/client";
import type {
  ExternalUrlCacheEntry,
  ExternalUrlCachePort,
} from "@/application/ports/external-url-cache.port";

export class ExternalUrlCacheRepository implements ExternalUrlCachePort {
  constructor(private readonly prisma: PrismaClient) {}

  async find(provider: string, type: string, internalId: string): Promise<string | null> {
    const row = await this.prisma.externalUrlCache.findFirst({
      where: { provider, type, internalId },
      select: { externalUrl: true },
    });
    return row?.externalUrl ?? null;
  }

  async save(entry: ExternalUrlCacheEntry): Promise<void> {
    await this.prisma.externalUrlCache.upsert({
      where: {
        provider_type_internalId: {
          provider: entry.provider,
          type: entry.type,
          internalId: entry.internalId,
        },
      },
      create: {
        provider: entry.provider,
        type: entry.type,
        internalId: entry.internalId,
        name: entry.name ?? null,
        artistName: entry.artistName ?? null,
        externalUrl: entry.externalUrl,
      },
      update: {
        externalUrl: entry.externalUrl,
        name: entry.name ?? null,
        artistName: entry.artistName ?? null,
      },
    });
  }
}
