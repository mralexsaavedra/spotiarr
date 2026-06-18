import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppError } from "@/domain/errors/app-error";
import { prisma } from "../../setup/prisma";
import { PrismaPlayHistoryRepository } from "../prisma-play-history.repository";

vi.mock("../../setup/prisma", () => ({
  prisma: {
    playHistory: {
      create: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("PrismaPlayHistoryRepository — aggregation", () => {
  let repo: PrismaPlayHistoryRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new PrismaPlayHistoryRepository();
  });

  // ── getTopTracks ──────────────────────────────────────────────────────────

  describe("getTopTracks", () => {
    it("returns empty array when no rows exist (S-08)", async () => {
      vi.mocked(prisma.playHistory.groupBy).mockResolvedValue([] as never);

      const result = await repo.getTopTracks(10);

      expect(result).toEqual([]);
    });

    it("returns tracks ordered by playCount desc, then lastPlayedAt desc as tiebreaker (S-09)", async () => {
      // Track A: 5 plays, lastPlayedAt = 2000 (most recent)
      // Track C: 5 plays, lastPlayedAt = 1000 (older)
      // Track B: 3 plays
      const groupByRows = [
        {
          trackUrl: "https://open.spotify.com/track/a",
          trackName: "Track A",
          artist: "Artist A",
          album: "Album A",
          albumCoverUrl: null,
          _count: { trackUrl: 5 },
          _max: { playedAt: BigInt(2000) },
        },
        {
          trackUrl: "https://open.spotify.com/track/c",
          trackName: "Track C",
          artist: "Artist C",
          album: null,
          albumCoverUrl: null,
          _count: { trackUrl: 5 },
          _max: { playedAt: BigInt(1000) },
        },
        {
          trackUrl: "https://open.spotify.com/track/b",
          trackName: "Track B",
          artist: "Artist B",
          album: null,
          albumCoverUrl: null,
          _count: { trackUrl: 3 },
          _max: { playedAt: BigInt(1500) },
        },
      ];
      vi.mocked(prisma.playHistory.groupBy).mockResolvedValue(groupByRows as never);

      const result = await repo.getTopTracks(10);

      expect(result).toHaveLength(3);
      expect(result[0].trackUrl).toBe("https://open.spotify.com/track/a");
      expect(result[0].playCount).toBe(5);
      expect(result[1].trackUrl).toBe("https://open.spotify.com/track/c");
      expect(result[1].playCount).toBe(5);
      expect(result[2].trackUrl).toBe("https://open.spotify.com/track/b");
      expect(result[2].playCount).toBe(3);
    });

    it("maps BigInt lastPlayedAt to Number at the JSON boundary", async () => {
      vi.mocked(prisma.playHistory.groupBy).mockResolvedValue([
        {
          trackUrl: "https://open.spotify.com/track/x",
          trackName: "Test",
          artist: "Artist",
          album: null,
          albumCoverUrl: null,
          _count: { trackUrl: 2 },
          _max: { playedAt: BigInt(1_700_000_000_000) },
        },
      ] as never);

      const result = await repo.getTopTracks(10);

      expect(typeof result[0].lastPlayedAt).toBe("number");
      expect(result[0].lastPlayedAt).toBe(1_700_000_000_000);
    });

    it("maps TopTrackItem shape correctly (REQ-LH-011)", async () => {
      vi.mocked(prisma.playHistory.groupBy).mockResolvedValue([
        {
          trackUrl: "https://open.spotify.com/track/x",
          trackName: "My Song",
          artist: "My Artist",
          album: "My Album",
          albumCoverUrl: "https://example.com/cover.jpg",
          _count: { trackUrl: 7 },
          _max: { playedAt: BigInt(9_000) },
        },
      ] as never);

      const [item] = await repo.getTopTracks(10);

      expect(item.trackUrl).toBe("https://open.spotify.com/track/x");
      expect(item.trackName).toBe("My Song");
      expect(item.artist).toBe("My Artist");
      expect(item.album).toBe("My Album");
      expect(item.albumCoverUrl).toBe("https://example.com/cover.jpg");
      expect(item.playCount).toBe(7);
      expect(item.lastPlayedAt).toBe(9_000);
    });

    it("handles null trackUrl group (trackName+artist composite fallback)", async () => {
      vi.mocked(prisma.playHistory.groupBy).mockResolvedValue([
        {
          trackUrl: null,
          trackName: "Null URL Track",
          artist: "Some Artist",
          album: null,
          albumCoverUrl: null,
          _count: { trackUrl: 3 },
          _max: { playedAt: BigInt(5_000) },
        },
      ] as never);

      const result = await repo.getTopTracks(10);

      expect(result).toHaveLength(1);
      expect(result[0].trackUrl).toBeNull();
      expect(result[0].trackName).toBe("Null URL Track");
      expect(result[0].playCount).toBe(3);
    });

    it("respects the limit parameter", async () => {
      vi.mocked(prisma.playHistory.groupBy).mockResolvedValue([] as never);

      await repo.getTopTracks(5);

      const call = vi.mocked(prisma.playHistory.groupBy).mock.calls[0][0] as { take?: number };
      expect(call.take).toBe(5);
    });
  });

  // ── getTopArtists ─────────────────────────────────────────────────────────

  describe("getTopArtists", () => {
    it("returns empty array when no rows exist (S-08 / REQ-LH-016)", async () => {
      vi.mocked(prisma.playHistory.groupBy).mockResolvedValue([] as never);

      const result = await repo.getTopArtists(10);

      expect(result).toEqual([]);
    });

    it("returns artists ordered by playCount desc with lastPlayedAt tiebreaker", async () => {
      vi.mocked(prisma.playHistory.groupBy).mockResolvedValue([
        {
          artist: "Artist A",
          _count: { artist: 10 },
          _max: { playedAt: BigInt(3000) },
          _countDistinct: undefined,
        },
        {
          artist: "Artist B",
          _count: { artist: 4 },
          _max: { playedAt: BigInt(1000) },
          _countDistinct: undefined,
        },
      ] as never);

      const result = await repo.getTopArtists(10);

      expect(result[0].artist).toBe("Artist A");
      expect(result[0].playCount).toBe(10);
      expect(result[1].artist).toBe("Artist B");
      expect(result[1].playCount).toBe(4);
    });

    it("maps TopArtistItem shape correctly (REQ-LH-015)", async () => {
      vi.mocked(prisma.playHistory.groupBy).mockResolvedValue([
        {
          artist: "Cool Band",
          _count: { artist: 6 },
          _max: { playedAt: BigInt(7_000) },
        },
      ] as never);

      const [item] = await repo.getTopArtists(10);

      expect(item.artist).toBe("Cool Band");
      expect(item.playCount).toBe(6);
      expect(typeof item.lastPlayedAt).toBe("number");
      expect(item.lastPlayedAt).toBe(7_000);
    });

    it("respects the limit parameter", async () => {
      vi.mocked(prisma.playHistory.groupBy).mockResolvedValue([] as never);

      await repo.getTopArtists(3);

      const call = vi.mocked(prisma.playHistory.groupBy).mock.calls[0][0] as { take?: number };
      expect(call.take).toBe(3);
    });
  });

  // ── getRecentPlays ────────────────────────────────────────────────────────

  describe("getRecentPlays", () => {
    it("returns empty array when no rows exist (REQ-LH-020)", async () => {
      vi.mocked(prisma.playHistory.findMany).mockResolvedValue([] as never);

      const result = await repo.getRecentPlays(20);

      expect(result).toEqual([]);
    });

    it("returns entries ordered by playedAt desc (most recent first)", async () => {
      vi.mocked(prisma.playHistory.findMany).mockResolvedValue([
        {
          id: "r1",
          trackId: "t1",
          trackUrl: "https://open.spotify.com/track/a",
          trackName: "Recent Track",
          artist: "Artist A",
          album: null,
          albumCoverUrl: null,
          durationMs: null,
          playedAt: BigInt(2000),
          createdAt: BigInt(0),
        },
        {
          id: "r2",
          trackId: null,
          trackUrl: null,
          trackName: "Older Track",
          artist: "Artist B",
          album: "Album B",
          albumCoverUrl: null,
          durationMs: 120_000,
          playedAt: BigInt(1000),
          createdAt: BigInt(0),
        },
      ] as never);

      const result = await repo.getRecentPlays(20);

      expect(result[0].trackName).toBe("Recent Track");
      expect(result[0].playedAt).toBe(2000);
      expect(result[1].trackName).toBe("Older Track");
      expect(result[1].playedAt).toBe(1000);
    });

    it("maps BigInt playedAt to Number at the JSON boundary", async () => {
      vi.mocked(prisma.playHistory.findMany).mockResolvedValue([
        {
          id: "r1",
          trackId: null,
          trackUrl: null,
          trackName: "A Track",
          artist: "Artist",
          album: null,
          albumCoverUrl: null,
          durationMs: null,
          playedAt: BigInt(1_700_000_000_000),
          createdAt: BigInt(0),
        },
      ] as never);

      const [item] = await repo.getRecentPlays(20);

      expect(typeof item.playedAt).toBe("number");
      expect(item.playedAt).toBe(1_700_000_000_000);
    });

    it("maps RecentPlayItem shape correctly (REQ-LH-019)", async () => {
      vi.mocked(prisma.playHistory.findMany).mockResolvedValue([
        {
          id: "r1",
          trackId: "t-123",
          trackUrl: "https://open.spotify.com/track/x",
          trackName: "Shape Test",
          artist: "Shape Artist",
          album: "Shape Album",
          albumCoverUrl: "https://example.com/img.jpg",
          durationMs: 200_000,
          playedAt: BigInt(5_000),
          createdAt: BigInt(0),
        },
      ] as never);

      const [item] = await repo.getRecentPlays(20);

      expect(item.trackId).toBe("t-123");
      expect(item.trackUrl).toBe("https://open.spotify.com/track/x");
      expect(item.trackName).toBe("Shape Test");
      expect(item.artist).toBe("Shape Artist");
      expect(item.album).toBe("Shape Album");
      expect(item.playedAt).toBe(5_000);
    });

    it("respects the limit parameter", async () => {
      vi.mocked(prisma.playHistory.findMany).mockResolvedValue([] as never);

      await repo.getRecentPlays(15);

      const call = vi.mocked(prisma.playHistory.findMany).mock.calls[0][0] as { take?: number };
      expect(call.take).toBe(15);
    });

    it("passes orderBy playedAt desc to Prisma", async () => {
      vi.mocked(prisma.playHistory.findMany).mockResolvedValue([] as never);

      await repo.getRecentPlays(20);

      const call = vi.mocked(prisma.playHistory.findMany).mock.calls[0][0] as {
        orderBy?: unknown;
      };
      expect(call.orderBy).toEqual({ playedAt: "desc" });
    });
  });

  // ── Prisma error mapping ──────────────────────────────────────────────────

  describe("error mapping", () => {
    it("maps groupBy Prisma failure to AppError for getTopTracks", async () => {
      vi.mocked(prisma.playHistory.groupBy).mockRejectedValue(new Error("DB failure"));

      await expect(repo.getTopTracks(10)).rejects.toBeInstanceOf(AppError);
    });

    it("maps groupBy Prisma failure to AppError for getTopArtists", async () => {
      vi.mocked(prisma.playHistory.groupBy).mockRejectedValue(new Error("DB failure"));

      await expect(repo.getTopArtists(10)).rejects.toBeInstanceOf(AppError);
    });

    it("maps findMany Prisma failure to AppError for getRecentPlays", async () => {
      vi.mocked(prisma.playHistory.findMany).mockRejectedValue(new Error("DB failure"));

      await expect(repo.getRecentPlays(20)).rejects.toBeInstanceOf(AppError);
    });
  });
});
