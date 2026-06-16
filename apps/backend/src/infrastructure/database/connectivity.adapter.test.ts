import { describe, expect, it, vi, beforeEach } from "vitest";
import { prisma } from "@/infrastructure/setup/prisma";
import { getTrackDownloadQueue } from "@/infrastructure/setup/queues";
import { ConnectivityAdapter } from "./connectivity.adapter";

vi.mock("@/infrastructure/setup/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/infrastructure/setup/queues", () => ({
  getTrackDownloadQueue: vi.fn(),
}));

describe("ConnectivityAdapter", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("pingDatabase", () => {
    it("calls prisma.$queryRaw with SELECT 1", async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ 1: 1 }] as any);

      const adapter = new ConnectivityAdapter();
      await adapter.pingDatabase();

      expect(prisma.$queryRaw).toHaveBeenCalledOnce();
    });

    it("propagates rejection from $queryRaw", async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("DB unreachable"));

      const adapter = new ConnectivityAdapter();
      await expect(adapter.pingDatabase()).rejects.toThrow("DB unreachable");
    });
  });

  describe("pingRedis", () => {
    it("calls client.ping() via the queue client", async () => {
      const ping = vi.fn().mockResolvedValue("PONG");
      vi.mocked(getTrackDownloadQueue).mockReturnValue({
        client: Promise.resolve({ ping }),
      } as any);

      const adapter = new ConnectivityAdapter();
      await adapter.pingRedis();

      expect(ping).toHaveBeenCalledOnce();
    });

    it("rejects with timeout error when ping does not resolve within 2000ms", async () => {
      vi.useFakeTimers();

      const ping = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
      vi.mocked(getTrackDownloadQueue).mockReturnValue({
        client: Promise.resolve({ ping }),
      } as any);

      const adapter = new ConnectivityAdapter();
      const pingPromise = adapter.pingRedis().catch((e) => e);

      await vi.advanceTimersByTimeAsync(2001);

      const error = await pingPromise;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("redis ping timed out");

      vi.useRealTimers();
    });

    it("propagates rejection when client.ping() rejects", async () => {
      const ping = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
      vi.mocked(getTrackDownloadQueue).mockReturnValue({
        client: Promise.resolve({ ping }),
      } as any);

      const adapter = new ConnectivityAdapter();
      await expect(adapter.pingRedis()).rejects.toThrow("ECONNREFUSED");
    });
  });
});
