import type { ArtworkBackfillRepositoryPort } from "@/application/ports/artwork-backfill-repository.port";
import { ARTWORK_BACKFILL_STATUS } from "@/domain/artwork-backfill.types";
import { AppError } from "@/domain/errors/app-error";

export class PauseArtworkBackfillUseCase {
  constructor(private readonly backfillRepository: ArtworkBackfillRepositoryPort) {}

  async execute(): Promise<{ runId: string; status: "pause_requested" | "paused" }> {
    const activeRun = await this.backfillRepository.getActiveRun();
    if (!activeRun) {
      throw new AppError(404, "invalid_request", "artwork_backfill_run_not_found");
    }

    if (activeRun.status === ARTWORK_BACKFILL_STATUS.Paused) {
      return { runId: activeRun.id, status: "paused" };
    }

    const updated = await this.backfillRepository.updateStatus({
      runId: activeRun.id,
      status: ARTWORK_BACKFILL_STATUS.PauseRequested,
    });

    return { runId: updated.id, status: "pause_requested" };
  }
}
