export interface FeedCacheEvictionPort {
  evictStaleFeedCache(artistIds: string[], cutoffDays: number): Promise<void>;
}

export class FeedCacheEvictionService {
  constructor(private readonly feedCacheEvictionPort: FeedCacheEvictionPort) {}

  async evictStaleFeedCache(artistIds: string[], cutoffDays = 90): Promise<void> {
    await this.feedCacheEvictionPort.evictStaleFeedCache(artistIds, cutoffDays);
  }
}
