import type { ConnectivityPort } from "@/application/ports/connectivity.port";
import { prisma } from "@/infrastructure/setup/prisma";
import { getTrackDownloadQueue } from "@/infrastructure/setup/queues";

// When Redis is unreachable, ioredis queues commands offline and retries
// indefinitely, so a bare ping() never settles. Cap it so /api/health always
// responds (well under the Docker HEALTHCHECK timeout).
const REDIS_PING_TIMEOUT_MS = 2000;

export class ConnectivityAdapter implements ConnectivityPort {
  async pingDatabase(): Promise<void> {
    await prisma.$queryRaw`SELECT 1`;
  }

  async pingRedis(): Promise<void> {
    // Reuse the BullMQ queue's Redis connection instead of opening a new socket.
    await withTimeout(
      (async () => {
        const client = await getTrackDownloadQueue().client;
        await client.ping();
      })(),
      REDIS_PING_TIMEOUT_MS,
    );
  }
}

function withTimeout<T>(operation: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("redis ping timed out")), ms);
    timer.unref?.();
    operation.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}
