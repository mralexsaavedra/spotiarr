import type { ArtworkBackfillStartResponse } from "@spotiarr/shared";
import type { ArtworkBackfillQueuePort } from "@/application/ports/artwork-backfill-queue.port";
import type { ArtworkBackfillRepositoryPort } from "@/application/ports/artwork-backfill-repository.port";
import { AppError } from "@/domain/errors/app-error";

export class StartArtworkBackfillUseCase {
  constructor(
    private readonly backfillRepository: ArtworkBackfillRepositoryPort,
    private readonly queuePort: ArtworkBackfillQueuePort,
  ) {}

  async execute(): Promise<ArtworkBackfillStartResponse> {
    const activeRun = await this.backfillRepository.getActiveRun();
    if (
      activeRun &&
      (activeRun.status === "running" ||
        activeRun.status === "pause_requested" ||
        activeRun.status === "paused" ||
        activeRun.status === "paused_rate_limited")
    ) {
      throw new AppError(409, "invalid_request", "artwork_backfill_already_running");
    }

    const run = await this.backfillRepository.createRun();
    await this.queuePort.enqueueRun(run.id);

    return { runId: run.id, status: "running" };
  }
}
