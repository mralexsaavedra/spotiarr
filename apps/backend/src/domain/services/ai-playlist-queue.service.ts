export interface AiPlaylistGenerateJobData {
  jobId: string;
  prompt: string;
  listeningContext?: string;
}

export interface AiPlaylistQueueService {
  enqueueGenerate(data: AiPlaylistGenerateJobData): Promise<void>;
}
