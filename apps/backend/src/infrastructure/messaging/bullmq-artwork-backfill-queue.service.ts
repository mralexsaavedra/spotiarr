import type { ArtworkBackfillQueuePort } from "@/application/ports/artwork-backfill-queue.port";
import { getArtworkBackfillQueue } from "../setup/queues";

export class BullMqArtworkBackfillQueueService implements ArtworkBackfillQueuePort {
  async enqueueRun(runId: string): Promise<void> {
    await getArtworkBackfillQueue().add(
      "artwork-backfill-run",
      { runId },
      {
        jobId: "artwork-backfill-active",
        removeOnComplete: true,
      },
    );
  }
}
