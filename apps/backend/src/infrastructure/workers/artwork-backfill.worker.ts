import { Worker, type Job } from "bullmq";
import { z } from "zod";
import { ProcessArtworkBackfillBatchUseCase } from "@/application/use-cases/artwork-backfill/process-artwork-backfill-batch.use-case";
import { container } from "@/container";
import { ARTWORK_BACKFILL_STATUS } from "@/domain/artwork-backfill.types";
import { AppError } from "@/domain/errors/app-error";
import { getEnv } from "../setup/environment";
import { ARTWORK_BACKFILL_QUEUE } from "../setup/queues";

const DEFAULT_BATCH_SIZE = 25;
const EXTERNAL_CALLS_CUTOFF = 150;
const COOLDOWN_MS = 10 * 60_000;

const ArtworkBackfillJobDataSchema = z.object({
  runId: z.string().min(1),
});

type JobData = z.infer<typeof ArtworkBackfillJobDataSchema>;

export interface ArtworkBackfillWorkerDependencies {
  backfillRepository: typeof container.artworkBackfillRepository;
  processBatchUseCase: ProcessArtworkBackfillBatchUseCase;
  eventBus: typeof container.eventBus;
  libraryService: Pick<typeof container.libraryService, "clearCache">;
}

export async function runArtworkBackfillJob(
  deps: ArtworkBackfillWorkerDependencies,
  data: JobData,
): Promise<void> {
  const { backfillRepository, processBatchUseCase, eventBus, libraryService } = deps;
  const run = await backfillRepository.getById(data.runId);
  if (!run || run.status !== ARTWORK_BACKFILL_STATUS.Running) return;

  let phase = run.phase;
  let cursorValue = run.cursorValue;
  let allowExternalFallback = run.externalCalls < EXTERNAL_CALLS_CUTOFF;

  while (true) {
    const current = await backfillRepository.getById(run.id);
    if (!current) return;

    if (current.status === ARTWORK_BACKFILL_STATUS.PauseRequested) {
      await backfillRepository.updateStatus({
        runId: run.id,
        status: ARTWORK_BACKFILL_STATUS.Paused,
      });
      eventBus.emit("artwork-backfill-updated", { runId: run.id, status: "paused" });
      return;
    }

    try {
      const result = await processBatchUseCase.execute({
        runId: run.id,
        phase,
        limit: DEFAULT_BATCH_SIZE,
        cursorValue,
        allowExternalFallback,
      });

      eventBus.emit("artwork-backfill-updated", { runId: run.id, ...result });

      if (result.processed === 0) {
        if (phase === "artists") {
          phase = "albums";
          cursorValue = null;
          continue;
        }

        await backfillRepository.updateStatus({
          runId: run.id,
          status: ARTWORK_BACKFILL_STATUS.Completed,
        });
        libraryService.clearCache();
        eventBus.emit("artwork-backfill-updated", { runId: run.id, status: "completed" });
        return;
      }

      cursorValue = result.cursorValue;

      const latestRun = await backfillRepository.getById(run.id);
      if (!latestRun) return;
      allowExternalFallback = latestRun.externalCalls < EXTERNAL_CALLS_CUTOFF;
    } catch (error) {
      if (isRateLimited(error)) {
        const rateLimitUntil = new Date(Date.now() + COOLDOWN_MS);
        await backfillRepository.updateStatus({
          runId: run.id,
          status: ARTWORK_BACKFILL_STATUS.PausedRateLimited,
          rateLimitUntil,
          error: "spotify_rate_limited",
        });
        eventBus.emit("artwork-backfill-updated", {
          runId: run.id,
          status: "paused_rate_limited",
          rateLimitUntil: rateLimitUntil.toISOString(),
        });
        return;
      }

      await backfillRepository.updateStatus({
        runId: run.id,
        status: ARTWORK_BACKFILL_STATUS.Error,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

function isRateLimited(error: unknown): boolean {
  return error instanceof AppError && error.statusCode === 429;
}

export function createArtworkBackfillWorker(): Worker {
  const {
    artworkBackfillRepository,
    processArtworkBackfillBatchUseCase,
    eventBus,
    libraryService,
  } = container;

  const worker = new Worker(
    ARTWORK_BACKFILL_QUEUE,
    async (job: Job<JobData>) => {
      const data = ArtworkBackfillJobDataSchema.parse(job.data);
      await runArtworkBackfillJob(
        {
          backfillRepository: artworkBackfillRepository,
          processBatchUseCase: processArtworkBackfillBatchUseCase,
          eventBus,
          libraryService,
        },
        data,
      );
    },
    {
      connection: {
        host: getEnv().REDIS_HOST,
        port: getEnv().REDIS_PORT,
      },
      concurrency: 1,
      lockDuration: 5 * 60_000,
      stalledInterval: 60_000,
      maxStalledCount: 1,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[ArtworkBackfillWorker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, error) => {
    console.error(`[ArtworkBackfillWorker] Job ${job?.id} failed`, error);
  });

  return worker;
}
