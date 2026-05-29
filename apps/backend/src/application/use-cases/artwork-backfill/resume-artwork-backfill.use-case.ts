import type { ArtworkBackfillQueuePort } from "@/application/ports/artwork-backfill-queue.port";
import type { ArtworkBackfillRepositoryPort } from "@/application/ports/artwork-backfill-repository.port";
import { ARTWORK_BACKFILL_STATUS } from "@/domain/artwork-backfill.types";
import { AppError } from "@/domain/errors/app-error";

export class ResumeArtworkBackfillUseCase {
  constructor(
    private readonly backfillRepository: ArtworkBackfillRepositoryPort,
    private readonly queuePort: ArtworkBackfillQueuePort,
  ) {}

  async execute(): Promise<{ runId: string; status: "running" }> {
    const activeRun = await this.backfillRepository.getActiveRun();
    if (!activeRun) {
      throw new AppError(404, "invalid_request", "artwork_backfill_run_not_found");
    }

    if (
      activeRun.status !== ARTWORK_BACKFILL_STATUS.Paused &&
      activeRun.status !== ARTWORK_BACKFILL_STATUS.PausedRateLimited
    ) {
      throw new AppError(409, "invalid_request", "artwork_backfill_run_not_paused");
    }

    const updated = await this.backfillRepository.updateStatus({
      runId: activeRun.id,
      status: ARTWORK_BACKFILL_STATUS.Running,
      rateLimitUntil: null,
      error: null,
    });

    await this.queuePort.enqueueRun(updated.id);

    return { runId: updated.id, status: "running" };
  }
}
