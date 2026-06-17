import { describe, expect, it, vi, beforeEach } from "vitest";
import { prisma } from "../setup/prisma";
import { PrismaHistoryRepository } from "./prisma-history.repository";

vi.mock("../setup/prisma", () => ({
  prisma: {
    downloadHistory: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    playlist: {
      findUnique: vi.fn(),
    },
  },
}));

describe("PrismaHistoryRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("findAll", () => {
    it("maps BigInt completedAt to Number", async () => {
      vi.mocked(prisma.downloadHistory.findMany).mockResolvedValue([
        {
          id: "h1",
          playlistId: "p1",
          playlistName: "My Playlist",
          playlistSpotifyUrl: null,
          trackId: "t1",
          trackName: "Track One",
          artist: "Artist",
          album: "Album",
          trackUrl: null,
          completedAt: BigInt(1700000000000),
        },
      ] as any);

      const repo = new PrismaHistoryRepository();
      const result = await repo.findAll();

      expect(result[0].completedAt).toBe(1700000000000);
      expect(typeof result[0].completedAt).toBe("number");
    });

    it("passes the limit argument to findMany", async () => {
      vi.mocked(prisma.downloadHistory.findMany).mockResolvedValue([]);

      const repo = new PrismaHistoryRepository();
      await repo.findAll(25);

      expect(prisma.downloadHistory.findMany).toHaveBeenCalledWith({
        take: 25,
        orderBy: { completedAt: "desc" },
      });
    });

    it("returns an empty array when there are no history rows", async () => {
      vi.mocked(prisma.downloadHistory.findMany).mockResolvedValue([]);

      const repo = new PrismaHistoryRepository();
      const result = await repo.findAll();

      expect(result).toEqual([]);
    });
  });

  describe("createFromTrack", () => {
    it("looks up the playlist when playlistId is set and stores its name", async () => {
      vi.mocked(prisma.playlist.findUnique).mockResolvedValue({
        name: "Jazz Vibes",
        spotifyUrl: "https://spotify.com/playlist/jv",
      } as any);
      vi.mocked(prisma.downloadHistory.create).mockResolvedValue({} as any);

      const repo = new PrismaHistoryRepository();
      await repo.createFromTrack({
        id: "t1",
        playlistId: "p1",
        name: "Track A",
        artist: "Coltrane",
        album: "A Love Supreme",
        trackUrl: null,
      } as any);

      expect(prisma.playlist.findUnique).toHaveBeenCalledWith({
        where: { id: "p1" },
        select: { name: true, spotifyUrl: true },
      });
      const createArg = vi.mocked(prisma.downloadHistory.create).mock.calls[0][0];
      expect(createArg.data.playlistName).toBe("Jazz Vibes");
      expect(createArg.data.playlistSpotifyUrl).toBe("https://spotify.com/playlist/jv");
    });

    it("skips the playlist lookup when playlistId is absent", async () => {
      vi.mocked(prisma.downloadHistory.create).mockResolvedValue({} as any);

      const repo = new PrismaHistoryRepository();
      await repo.createFromTrack({
        id: "t2",
        playlistId: undefined,
        name: "Track B",
        artist: "Miles",
        album: null,
        trackUrl: null,
      } as any);

      expect(prisma.playlist.findUnique).not.toHaveBeenCalled();
      const createArg = vi.mocked(prisma.downloadHistory.create).mock.calls[0][0];
      expect(createArg.data.playlistName).toBe("Unknown");
    });

    it("stores completedAt as a BigInt", async () => {
      vi.mocked(prisma.playlist.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.downloadHistory.create).mockResolvedValue({} as any);

      const repo = new PrismaHistoryRepository();
      await repo.createFromTrack({
        id: "t3",
        playlistId: "p2",
        name: "Track C",
        artist: "Monk",
        album: null,
        trackUrl: null,
      } as any);

      const createArg = vi.mocked(prisma.downloadHistory.create).mock.calls[0][0];
      expect(typeof createArg.data.completedAt).toBe("bigint");
    });
  });
});
