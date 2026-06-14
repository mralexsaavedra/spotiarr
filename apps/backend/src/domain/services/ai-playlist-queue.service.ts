export interface AiPlaylistGenerateJobData {
  jobId: string;
  prompt: string;
}

export interface AiPlaylistQueueService {
  enqueueGenerate(data: AiPlaylistGenerateJobData): Promise<void>;
}
