import { describe, expect, it, vi } from "vitest";
import { SYNC_STATUS, FeedRepository } from "./feed.repository";

describe("FeedRepository facade", () => {
  it("delegates to split repositories", async () => {
    const followed = {
      getArtists: vi.fn().mockResolvedValue([]),
      getArtistBySpotifyId: vi.fn(),
      getArtistCatalogIdentities: vi.fn(),
      updateArtistCatalogIdentities: vi.fn(),
      upsertArtists: vi.fn(),
      getArtistIdsWithNoAlbums: vi.fn(),
      getArtistIdsNeedingCatalogSync: vi.fn(),
      updateArtistCatalogSyncedAt: vi.fn(),
      updateArtistReleasesSyncedAt: vi.fn(),
      getActiveArtistIdsForReleasesSync: vi.fn(),
    } as any;
    const album = { getArtistAlbumsFreshness: vi.fn().mockResolvedValue(null) } as any;
    const release = { getReleases: vi.fn().mockResolvedValue([]) } as any;
    const sync = {
      getSyncState: vi
        .fn()
        .mockResolvedValue({ id: 1, status: SYNC_STATUS.Idle, lastSyncAt: null, error: null }),
    } as any;
    const eviction = { evictStaleFeedCache: vi.fn().mockResolvedValue(undefined) } as any;

    const repo = new FeedRepository(followed, album, release, sync, eviction);

    await repo.getArtists();
    await repo.getReleases(30);
    await repo.getSyncState();

    expect(followed.getArtists).toHaveBeenCalledOnce();
    expect(release.getReleases).toHaveBeenCalledWith(30);
    expect(sync.getSyncState).toHaveBeenCalledOnce();
  });
});
