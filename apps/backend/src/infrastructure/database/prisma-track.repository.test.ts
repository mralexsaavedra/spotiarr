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

describe("PrismaTrackRepository.findStuckTracks", () => {
  describe("R1-S1: recently-active row is NOT returned even if createdAt is old", () => {
    it("excludes a track whose lastActivityAt is within the timeout window", async () => {
      const now = Date.now();
      const threshold = now - 10 * 60 * 1000;

      const prisma = {
        track: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      } as unknown as { track: { findMany: ReturnType<typeof vi.fn> } };

      const repo = new PrismaTrackRepository(prisma);
      await repo.findStuckTracks([TrackStatusEnum.Downloading], threshold);

      expect(prisma.track.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            lastActivityAt: expect.objectContaining({ lt: BigInt(threshold) }),
          }),
        }),
      );

      expect(prisma.track.findMany).toHaveBeenCalledWith(
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

      const prisma = {
        track: {
          findMany: vi.fn().mockResolvedValue([staleTrack]),
        },
      } as unknown as { track: { findMany: ReturnType<typeof vi.fn> } };

      const repo = new PrismaTrackRepository(prisma);
      const result = await repo.findStuckTracks([TrackStatusEnum.Searching], threshold);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("stale-track");
    });
  });

  describe("R1-S3: recently re-activated track is NOT re-marked as stuck", () => {
    it("excludes a track whose lastActivityAt was refreshed (markAsNew stamps it to now)", async () => {
      const now = Date.now();
      const threshold = now - 10 * 60 * 1000;

      const prisma = {
        track: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      } as unknown as { track: { findMany: ReturnType<typeof vi.fn> } };

      const repo = new PrismaTrackRepository(prisma);
      const result = await repo.findStuckTracks([TrackStatusEnum.New], threshold);

      expect(prisma.track.findMany).toHaveBeenCalledWith(
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

    const prisma = {
      track: {
        create: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({
            ...makeDbTrack(),
            ...data,
            playlist: null,
          }),
        ),
      },
    } as unknown as { track: { create: ReturnType<typeof vi.fn> } };

    const repo = new PrismaTrackRepository(prisma);
    await repo.save({
      name: "Song",
      artist: "Artist",
      status: TrackStatusEnum.New,
    });

    const createArg = (prisma.track.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const stamped = createArg.data.lastActivityAt;
    expect(typeof stamped).toBe("bigint");
    expect(Number(stamped)).toBeGreaterThanOrEqual(before);
  });
});

describe("PrismaTrackRepository.update", () => {
  it("stamps lastActivityAt with current epoch-ms on update", async () => {
    const before = Date.now();

    const prisma = {
      track: {
        update: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as { track: { update: ReturnType<typeof vi.fn> } };

    const repo = new PrismaTrackRepository(prisma);
    await repo.update("track-1", { status: TrackStatusEnum.Downloading });

    const updateArg = (prisma.track.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const stamped = updateArg.data.lastActivityAt;
    expect(typeof stamped).toBe("bigint");
    expect(Number(stamped)).toBeGreaterThanOrEqual(before);
  });
});
