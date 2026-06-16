import type { ITrack } from "@spotiarr/shared";
import { describe, expect, it, vi, beforeEach } from "vitest";

const downloadAddMock = vi.fn();
const searchAddMock = vi.fn();

vi.mock("../setup/queues", () => ({
  getTrackDownloadQueue: () => ({ add: downloadAddMock }),
  getTrackSearchQueue: () => ({ add: searchAddMock }),
}));

const baseTrack: ITrack = {
  id: "track-1",
  name: "Some Track",
  artist: "Some Artist",
  album: "Some Album",
  albumArtist: "Some Artist",
  status: "new" as any,
  trackNumber: 3,
  discNumber: 1,
  durationMs: 240000,
  playlistIndex: null,
  playlistId: null,
  error: null,
  youtubeUrl: null,
  spotifyId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as ITrack;

describe("BullMqTrackQueueService — enqueueSearchTrack", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enqueues a 'search-track' job with the track as data", async () => {
    const { BullMqTrackQueueService } = await import("./bullmq-track-queue.service");
    const service = new BullMqTrackQueueService();

    await service.enqueueSearchTrack(baseTrack);

    expect(searchAddMock).toHaveBeenCalledOnce();
    expect(searchAddMock).toHaveBeenCalledWith(
      "search-track",
      baseTrack,
      expect.objectContaining({ jobId: `id-${baseTrack.id}` }),
    );
  });

  it("uses the track id to form the jobId for search", async () => {
    const { BullMqTrackQueueService } = await import("./bullmq-track-queue.service");
    const service = new BullMqTrackQueueService();

    await service.enqueueSearchTrack({ ...baseTrack, id: "abc-99" } as unknown as ITrack);

    const [, , opts] = searchAddMock.mock.calls[0];
    expect(opts.jobId).toBe("id-abc-99");
  });

  it("propagates search queue errors to the caller", async () => {
    const { BullMqTrackQueueService } = await import("./bullmq-track-queue.service");
    const service = new BullMqTrackQueueService();
    searchAddMock.mockRejectedValueOnce(new Error("search queue down"));

    await expect(service.enqueueSearchTrack(baseTrack)).rejects.toThrow("search queue down");
  });
});

describe("BullMqTrackQueueService — enqueueDownloadTrack", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enqueues a 'download-track' job with the track as data", async () => {
    const { BullMqTrackQueueService } = await import("./bullmq-track-queue.service");
    const service = new BullMqTrackQueueService();

    await service.enqueueDownloadTrack(baseTrack);

    expect(downloadAddMock).toHaveBeenCalledOnce();
    expect(downloadAddMock).toHaveBeenCalledWith(
      "download-track",
      baseTrack,
      expect.objectContaining({ jobId: `download-${baseTrack.id}` }),
    );
  });

  it("defaults to 3 attempts when no options are provided", async () => {
    const { BullMqTrackQueueService } = await import("./bullmq-track-queue.service");
    const service = new BullMqTrackQueueService();

    await service.enqueueDownloadTrack(baseTrack);

    const [, , opts] = downloadAddMock.mock.calls[0];
    expect(opts.attempts).toBe(3);
  });

  it("uses the maxRetries option when provided", async () => {
    const { BullMqTrackQueueService } = await import("./bullmq-track-queue.service");
    const service = new BullMqTrackQueueService();

    await service.enqueueDownloadTrack(baseTrack, { maxRetries: 7 });

    const [, , opts] = downloadAddMock.mock.calls[0];
    expect(opts.attempts).toBe(7);
  });

  it("uses exponential backoff with a 5 second delay", async () => {
    const { BullMqTrackQueueService } = await import("./bullmq-track-queue.service");
    const service = new BullMqTrackQueueService();

    await service.enqueueDownloadTrack(baseTrack);

    const [, , opts] = downloadAddMock.mock.calls[0];
    expect(opts.backoff).toEqual({ type: "exponential", delay: 5000 });
  });

  it("sets both removeOnComplete and removeOnFail to prevent stale jobId locks", async () => {
    const { BullMqTrackQueueService } = await import("./bullmq-track-queue.service");
    const service = new BullMqTrackQueueService();

    await service.enqueueDownloadTrack(baseTrack);

    const [, , opts] = downloadAddMock.mock.calls[0];
    expect(opts.removeOnComplete).toBe(true);
    expect(opts.removeOnFail).toBe(true);
  });

  it("propagates download queue errors to the caller", async () => {
    const { BullMqTrackQueueService } = await import("./bullmq-track-queue.service");
    const service = new BullMqTrackQueueService();
    downloadAddMock.mockRejectedValueOnce(new Error("download queue down"));

    await expect(service.enqueueDownloadTrack(baseTrack)).rejects.toThrow("download queue down");
  });
});
