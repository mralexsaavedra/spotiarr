import type { PrismaClient } from "@prisma/client";
import type {
  ArtworkBackfillCheckpointUpdate,
  ArtworkBackfillRepositoryPort,
} from "@/application/ports/artwork-backfill-repository.port";
import { ARTWORK_BACKFILL_STATUS, type ArtworkBackfillRun } from "@/domain/artwork-backfill.types";

export class PrismaArtworkBackfillRepository implements ArtworkBackfillRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async createRun(): Promise<ArtworkBackfillRun> {
    const created = await this.prisma.artworkBackfillRun.create({
      data: {
        status: ARTWORK_BACKFILL_STATUS.Running,
        phase: "artists",
        cursorKind: "artist",
      },
    });

    return this.toDomain(created);
  }

  async getById(id: string): Promise<ArtworkBackfillRun | null> {
    const run = await this.prisma.artworkBackfillRun.findUnique({ where: { id } });
    return run ? this.toDomain(run) : null;
  }

  async getActiveRun(): Promise<ArtworkBackfillRun | null> {
    const run = await this.prisma.artworkBackfillRun.findFirst({
      where: {
        status: {
          in: [
            ARTWORK_BACKFILL_STATUS.Running,
            ARTWORK_BACKFILL_STATUS.PauseRequested,
            ARTWORK_BACKFILL_STATUS.Paused,
            ARTWORK_BACKFILL_STATUS.PausedRateLimited,
          ],
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return run ? this.toDomain(run) : null;
  }

  async updateStatus(input: {
    runId: string;
    status: ArtworkBackfillRun["status"];
    error?: string | null;
    rateLimitUntil?: Date | null;
  }): Promise<ArtworkBackfillRun> {
    const updated = await this.prisma.artworkBackfillRun.update({
      where: { id: input.runId },
      data: {
        status: input.status,
        error: input.error ?? null,
        rateLimitUntil: input.rateLimitUntil ?? null,
      },
    });

    return this.toDomain(updated);
  }

  async updateCheckpoint(input: ArtworkBackfillCheckpointUpdate): Promise<ArtworkBackfillRun> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.artworkBackfillRun.findUniqueOrThrow({
        where: { id: input.runId },
        select: {
          processed: true,
          skippedExisting: true,
          written: true,
          failed: true,
          externalCalls: true,
        },
      });

      const updated = await tx.artworkBackfillRun.update({
        where: { id: input.runId },
        data: {
          phase: input.phase,
          cursorKind: input.cursorKind,
          cursorValue: input.cursorValue,
          totalCandidates: input.totalCandidates,
          processed: current.processed + input.processed,
          skippedExisting: current.skippedExisting + input.skippedExisting,
          written: current.written + input.written,
          failed: current.failed + input.failed,
          externalCalls: current.externalCalls + input.externalCalls,
        },
      });

      return this.toDomain(updated);
    });
  }

  private toDomain(data: {
    id: string;
    status: string;
    phase: string;
    cursorKind: string;
    cursorValue: string | null;
    totalCandidates: number;
    processed: number;
    skippedExisting: number;
    written: number;
    failed: number;
    externalCalls: number;
    rateLimitUntil: Date | null;
    error: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ArtworkBackfillRun {
    return {
      id: data.id,
      status: data.status as ArtworkBackfillRun["status"],
      phase: data.phase as ArtworkBackfillRun["phase"],
      cursorKind: data.cursorKind as ArtworkBackfillRun["cursorKind"],
      cursorValue: data.cursorValue,
      totalCandidates: data.totalCandidates,
      processed: data.processed,
      skippedExisting: data.skippedExisting,
      written: data.written,
      failed: data.failed,
      externalCalls: data.externalCalls,
      rateLimitUntil: data.rateLimitUntil,
      error: data.error,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
