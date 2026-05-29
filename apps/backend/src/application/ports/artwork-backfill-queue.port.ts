export interface ArtworkBackfillQueuePort {
  enqueueRun(runId: string): Promise<void>;
}
