import type { RecordPlayInput } from "@spotiarr/shared";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppError } from "@/domain/errors/app-error";
import { prisma } from "../../setup/prisma";
import { PrismaPlayHistoryRepository } from "../prisma-play-history.repository";

vi.mock("../../setup/prisma", () => ({
  prisma: {
    playHistory: {
      create: vi.fn(),
    },
  },
}));

function makeInput(overrides: Partial<RecordPlayInput> = {}): RecordPlayInput {
  return {
    trackId: "track-uuid-1",
    trackUrl: "https://open.spotify.com/track/abc",
    trackName: "Test Track",
    artist: "Test Artist",
    album: "Test Album",
    albumCoverUrl: null,
    durationMs: 180_000,
    playedAt: 1_700_000_000_000,
    ...overrides,
  };
}

describe("PrismaPlayHistoryRepository.recordPlay", () => {
  let repo: PrismaPlayHistoryRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new PrismaPlayHistoryRepository();
  });

  it("inserts a row with the correct fields", async () => {
    vi.mocked(prisma.playHistory.create).mockResolvedValue({} as never);

    const input = makeInput();
    await repo.recordPlay(input);

    expect(prisma.playHistory.create).toHaveBeenCalledOnce();
    const createArg = vi.mocked(prisma.playHistory.create).mock.calls[0][0];
    expect(createArg.data.trackName).toBe("Test Track");
    expect(createArg.data.artist).toBe("Test Artist");
    expect(createArg.data.album).toBe("Test Album");
    expect(createArg.data.trackUrl).toBe("https://open.spotify.com/track/abc");
    expect(createArg.data.trackId).toBe("track-uuid-1");
  });

  it("stores playedAt as BigInt (convention from DownloadHistory)", async () => {
    vi.mocked(prisma.playHistory.create).mockResolvedValue({} as never);

    await repo.recordPlay(makeInput({ playedAt: 1_700_000_000_000 }));

    const createArg = vi.mocked(prisma.playHistory.create).mock.calls[0][0];
    expect(typeof createArg.data.playedAt).toBe("bigint");
    expect(createArg.data.playedAt).toBe(BigInt(1_700_000_000_000));
  });

  it("accepts null trackId (orphaned play event)", async () => {
    vi.mocked(prisma.playHistory.create).mockResolvedValue({} as never);

    await repo.recordPlay(makeInput({ trackId: null }));

    const createArg = vi.mocked(prisma.playHistory.create).mock.calls[0][0];
    expect(createArg.data.trackId).toBeNull();
  });

  it("accepts null trackUrl", async () => {
    vi.mocked(prisma.playHistory.create).mockResolvedValue({} as never);

    await repo.recordPlay(makeInput({ trackUrl: null }));

    const createArg = vi.mocked(prisma.playHistory.create).mock.calls[0][0];
    expect(createArg.data.trackUrl).toBeNull();
  });

  it("accepts null durationMs", async () => {
    vi.mocked(prisma.playHistory.create).mockResolvedValue({} as never);

    await repo.recordPlay(makeInput({ durationMs: null }));

    const createArg = vi.mocked(prisma.playHistory.create).mock.calls[0][0];
    expect(createArg.data.durationMs).toBeNull();
  });

  it("maps a Prisma failure to AppError with internal_server_error", async () => {
    const prismaError = new Error("DB connection reset");
    vi.mocked(prisma.playHistory.create).mockRejectedValue(prismaError);

    await expect(repo.recordPlay(makeInput())).rejects.toBeInstanceOf(AppError);
    await expect(repo.recordPlay(makeInput())).rejects.toMatchObject({
      errorCode: "internal_server_error",
      statusCode: 500,
    });
  });
});
