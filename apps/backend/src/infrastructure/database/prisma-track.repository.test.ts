import type { PrismaClient } from "@prisma/client";
import { TrackStatusEnum } from "@spotiarr/shared";
import { describe, expect, it, vi } from "vitest";
import { PrismaTrackRepository } from "./prisma-track.repository";

function makeDbTrack(overrides: Record<string, unknown> = {}) {
  return {
    id: "track-1",
    name: "Song",
    artist: "Artist",
    albumArtist: null,
    album: null,
    albumUrl: null,
    albumCoverUrl: null,
    primaryArtistImageUrl: null,
    albumYear: null,
    trackNumber: null,
    durationMs: null,
    spotifyUrl: null,
    trackUrl: null,
    artists: null,
    youtubeUrl: null,
    status: "New",
    error: null,
    createdAt: BigInt(1000),
    completedAt: null,
    playlistId: null,
    playlistIndex: null,
    lastActivityAt: BigInt(1000),
    playlist: null,
    ...overrides,
  };
}

function makePrisma(track: Record<string, ReturnType<typeof vi.fn>>): PrismaClient {
  return { track } as unknown as PrismaClient;
}

describe("PrismaTrackRepository.findStuckTracks", () => {
  describe("R1-S1: recently-active row is NOT returned even if createdAt is old", () => {
    it("excludes a track whose lastActivityAt is within the timeout window", async () => {
      const now = Date.now();
      const threshold = now - 10 * 60 * 1000;

      const findMany = vi.fn().mockResolvedValue([]);
      const repo = new PrismaTrackRepository(makePrisma({ findMany }));
      await repo.findStuckTracks([TrackStatusEnum.Downloading], threshold);

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            lastActivityAt: expect.objectContaining({ lt: BigInt(threshold) }),
          }),
        }),
      );

      expect(findMany).toHaveBeenCalledWith(
        expect.not.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.anything(),
          }),
        }),
      );
    });
  });

  describe("R1-S2: genuinely stale track IS returned", () => {
    it("includes a track whose lastActivityAt is older than the timeout threshold", async () => {
      const now = Date.now();
      const threshold = now - 10 * 60 * 1000;

      const staleTrack = makeDbTrack({
        id: "stale-track",
        status: TrackStatusEnum.Searching,
        createdAt: BigInt(now - 30 * 60 * 1000),
        lastActivityAt: BigInt(now - 20 * 60 * 1000),
      });

      const findMany = vi.fn().mockResolvedValue([staleTrack]);
      const repo = new PrismaTrackRepository(makePrisma({ findMany }));
      const result = await repo.findStuckTracks([TrackStatusEnum.Searching], threshold);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("stale-track");
    });
  });

  describe("R1-S3: recently re-activated track is NOT re-marked as stuck", () => {
    it("excludes a track whose lastActivityAt was refreshed (markAsNew stamps it to now)", async () => {
      const now = Date.now();
      const threshold = now - 10 * 60 * 1000;

      const findMany = vi.fn().mockResolvedValue([]);
      const repo = new PrismaTrackRepository(makePrisma({ findMany }));
      const result = await repo.findStuckTracks([TrackStatusEnum.New], threshold);

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            lastActivityAt: { lt: BigInt(threshold) },
          }),
        }),
      );
      expect(result).toHaveLength(0);
    });
  });
});

describe("PrismaTrackRepository.save", () => {
  it("stamps lastActivityAt with current epoch-ms on create", async () => {
    const before = Date.now();

    const create = vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        ...makeDbTrack(),
        ...data,
        playlist: null,
      }),
    );
    const repo = new PrismaTrackRepository(makePrisma({ create }));
    await repo.save({
      name: "Song",
      artist: "Artist",
      status: TrackStatusEnum.New,
    });

    const createArg = create.mock.calls[0][0];
    const stamped = createArg.data.lastActivityAt;
    expect(typeof stamped).toBe("bigint");
    expect(Number(stamped)).toBeGreaterThanOrEqual(before);
  });
});

describe("PrismaTrackRepository.update", () => {
  it("stamps lastActivityAt with current epoch-ms on update", async () => {
    const before = Date.now();

    const update = vi.fn().mockResolvedValue(undefined);
    const repo = new PrismaTrackRepository(makePrisma({ update }));
    await repo.update("track-1", { status: TrackStatusEnum.Downloading });

    const updateArg = update.mock.calls[0][0];
    const stamped = updateArg.data.lastActivityAt;
    expect(typeof stamped).toBe("bigint");
    expect(Number(stamped)).toBeGreaterThanOrEqual(before);
  });
});

// T2.1 — markDownloadingIfNotAlready CAS claim
describe("PrismaTrackRepository.markDownloadingIfNotAlready", () => {
  describe("R3-S1: returns false when track is already Downloading", () => {
    it("returns false and does not mutate when count === 0 (already Downloading)", async () => {
      const updateMany = vi.fn().mockResolvedValue({ count: 0 });
      const repo = new PrismaTrackRepository(makePrisma({ updateMany }));

      const result = await repo.markDownloadingIfNotAlready("track-1");

      expect(result).toBe(false);
      expect(updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "track-1",
            status: { not: TrackStatusEnum.Downloading },
          }),
        }),
      );
    });
  });

  describe("R3-S1 (complement): returns true when track transitions to Downloading", () => {
    it("returns true when count === 1 (claim succeeded)", async () => {
      const updateMany = vi.fn().mockResolvedValue({ count: 1 });
      const repo = new PrismaTrackRepository(makePrisma({ updateMany }));

      const result = await repo.markDownloadingIfNotAlready("track-1");

      expect(result).toBe(true);
    });

    it("stamps lastActivityAt on a successful claim", async () => {
      const before = Date.now();
      const updateMany = vi.fn().mockResolvedValue({ count: 1 });
      const repo = new PrismaTrackRepository(makePrisma({ updateMany }));

      await repo.markDownloadingIfNotAlready("track-1");

      const arg = updateMany.mock.calls[0][0];
      expect(typeof arg.data.lastActivityAt).toBe("bigint");
      expect(Number(arg.data.lastActivityAt)).toBeGreaterThanOrEqual(before);
    });
  });
});

// T2.2 — updateStatusIf conditional terminal write
describe("PrismaTrackRepository.updateStatusIf", () => {
  describe("R2-S1: applies update when expected status matches", () => {
    it("returns true when the row is updated (count === 1)", async () => {
      const updateMany = vi.fn().mockResolvedValue({ count: 1 });
      const repo = new PrismaTrackRepository(makePrisma({ updateMany }));

      const result = await repo.updateStatusIf("track-1", TrackStatusEnum.Downloading, {
        status: TrackStatusEnum.Completed,
      });

      expect(result).toBe(true);
      expect(updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "track-1",
            status: TrackStatusEnum.Downloading,
          }),
        }),
      );
    });

    it("stamps lastActivityAt on a successful conditional update", async () => {
      const before = Date.now();
      const updateMany = vi.fn().mockResolvedValue({ count: 1 });
      const repo = new PrismaTrackRepository(makePrisma({ updateMany }));

      await repo.updateStatusIf("track-1", TrackStatusEnum.Downloading, {
        status: TrackStatusEnum.Completed,
      });

      const arg = updateMany.mock.calls[0][0];
      expect(typeof arg.data.lastActivityAt).toBe("bigint");
      expect(Number(arg.data.lastActivityAt)).toBeGreaterThanOrEqual(before);
    });
  });

  describe("R2-S2: is a no-op when status does not match (stale writer)", () => {
    it("returns false when count === 0 (status mismatch)", async () => {
      const updateMany = vi.fn().mockResolvedValue({ count: 0 });
      const repo = new PrismaTrackRepository(makePrisma({ updateMany }));

      const result = await repo.updateStatusIf("track-1", TrackStatusEnum.Downloading, {
        status: TrackStatusEnum.Completed,
      });

      expect(result).toBe(false);
    });
  });
});
