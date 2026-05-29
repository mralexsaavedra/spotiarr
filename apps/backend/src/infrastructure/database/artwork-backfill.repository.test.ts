import { describe, expect, it, vi } from "vitest";
import { ARTWORK_BACKFILL_STATUS, type ArtworkBackfillRun } from "@/domain/artwork-backfill.types";
import { PrismaArtworkBackfillRepository } from "./artwork-backfill.repository";

describe("PrismaArtworkBackfillRepository", () => {
  it("creates a new run with default counters and running status", async () => {
    const createdAt = new Date("2026-01-10T00:00:00.000Z");
    const prisma = {
      artworkBackfillRun: {
        create: vi.fn().mockResolvedValue({
          id: "run-1",
          status: ARTWORK_BACKFILL_STATUS.Running,
          phase: "artists",
          cursorKind: "artist",
          cursorValue: null,
          totalCandidates: 0,
          processed: 0,
          skippedExisting: 0,
          written: 0,
          failed: 0,
          externalCalls: 0,
          rateLimitUntil: null,
          error: null,
          createdAt,
          updatedAt: createdAt,
        }),
      },
    } as any;

    const repository = new PrismaArtworkBackfillRepository(prisma);
    const run = await repository.createRun();

    expect(prisma.artworkBackfillRun.create).toHaveBeenCalledOnce();
    expect(run).toMatchObject<Partial<ArtworkBackfillRun>>({
      id: "run-1",
      status: ARTWORK_BACKFILL_STATUS.Running,
      phase: "artists",
      cursorKind: "artist",
      processed: 0,
      skippedExisting: 0,
      written: 0,
      failed: 0,
      externalCalls: 0,
    });
  });

  it("updates checkpoint atomically", async () => {
    const updatedAt = new Date("2026-01-10T01:00:00.000Z");
    const prisma = {
      $transaction: vi.fn(async (cb: (tx: any) => Promise<unknown>) =>
        cb({
          artworkBackfillRun: {
            findUniqueOrThrow: vi.fn().mockResolvedValue({
              processed: 0,
              skippedExisting: 0,
              written: 0,
              failed: 0,
              externalCalls: 0,
            }),
            update: vi.fn().mockResolvedValue({
              id: "run-1",
              status: ARTWORK_BACKFILL_STATUS.Running,
              phase: "albums",
              cursorKind: "album",
              cursorValue: "Artist/Album",
              totalCandidates: 20,
              processed: 8,
              skippedExisting: 3,
              written: 4,
              failed: 1,
              externalCalls: 2,
              rateLimitUntil: null,
              error: null,
              createdAt: new Date("2026-01-10T00:00:00.000Z"),
              updatedAt,
            }),
          },
        }),
      ),
    } as any;

    const repository = new PrismaArtworkBackfillRepository(prisma);
    const run = await repository.updateCheckpoint({
      runId: "run-1",
      phase: "albums",
      cursorKind: "album",
      cursorValue: "Artist/Album",
      totalCandidates: 20,
      processed: 8,
      skippedExisting: 3,
      written: 4,
      failed: 1,
      externalCalls: 2,
    });

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(run.cursorValue).toBe("Artist/Album");
    expect(run.processed).toBe(8);
  });

  it("accumulates checkpoint counters across batches", async () => {
    const updatedAt = new Date("2026-01-10T02:00:00.000Z");
    const update = vi.fn().mockResolvedValue({
      id: "run-1",
      status: ARTWORK_BACKFILL_STATUS.Running,
      phase: "albums",
      cursorKind: "album",
      cursorValue: "album:next",
      totalCandidates: 30,
      processed: 13,
      skippedExisting: 7,
      written: 5,
      failed: 1,
      externalCalls: 4,
      rateLimitUntil: null,
      error: null,
      createdAt: new Date("2026-01-10T00:00:00.000Z"),
      updatedAt,
    });

    const prisma = {
      $transaction: vi.fn(async (cb: (tx: any) => Promise<unknown>) =>
        cb({
          artworkBackfillRun: {
            findUniqueOrThrow: vi.fn().mockResolvedValue({
              processed: 10,
              skippedExisting: 4,
              written: 3,
              failed: 1,
              externalCalls: 2,
            }),
            update,
          },
        }),
      ),
    } as any;

    const repository = new PrismaArtworkBackfillRepository(prisma);
    const run = await repository.updateCheckpoint({
      runId: "run-1",
      phase: "albums",
      cursorKind: "album",
      cursorValue: "album:next",
      totalCandidates: 30,
      processed: 3,
      skippedExisting: 3,
      written: 2,
      failed: 0,
      externalCalls: 2,
    });

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          processed: 13,
          skippedExisting: 7,
          written: 5,
          failed: 1,
          externalCalls: 4,
        }),
      }),
    );
    expect(run.processed).toBe(13);
  });

  it("returns null when no active run exists", async () => {
    const prisma = {
      artworkBackfillRun: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as any;

    const repository = new PrismaArtworkBackfillRepository(prisma);
    await expect(repository.getActiveRun()).resolves.toBeNull();
    expect(prisma.artworkBackfillRun.findFirst).toHaveBeenCalledOnce();
  });
});
