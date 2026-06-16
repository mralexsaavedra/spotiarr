import { describe, expect, it, vi, beforeEach } from "vitest";
import { prisma } from "../setup/prisma";
import { PrismaPlaylistRepository } from "./prisma-playlist.repository";

vi.mock("../setup/prisma", () => ({
  prisma: {
    playlist: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

function makeDbPlaylist(overrides: Record<string, unknown> = {}) {
  return {
    id: "pl-1",
    name: "Test Playlist",
    type: "playlist",
    spotifyUrl: "https://open.spotify.com/playlist/pl-1",
    error: null,
    subscribed: false,
    createdAt: BigInt(1700000000000),
    coverUrl: null,
    artistImageUrl: null,
    owner: null,
    ownerUrl: null,
    tracks: undefined,
    ...overrides,
  };
}

describe("PrismaPlaylistRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("findAll", () => {
    it("returns mapped Playlist entities with BigInt createdAt converted to Number", async () => {
      vi.mocked(prisma.playlist.findMany).mockResolvedValue([makeDbPlaylist()] as any);

      const repo = new PrismaPlaylistRepository();
      const result = await repo.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("pl-1");
      expect(result[0].createdAt).toBe(1700000000000);
      expect(typeof result[0].createdAt).toBe("number");
    });

    it("returns an empty array when no playlists exist", async () => {
      vi.mocked(prisma.playlist.findMany).mockResolvedValue([]);

      const repo = new PrismaPlaylistRepository();
      const result = await repo.findAll();

      expect(result).toEqual([]);
    });

    it("includes tracks in the query when includesTracks is true", async () => {
      vi.mocked(prisma.playlist.findMany).mockResolvedValue([]);

      const repo = new PrismaPlaylistRepository();
      await repo.findAll(true);

      expect(prisma.playlist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ include: { tracks: true } }),
      );
    });
  });

  describe("findOne", () => {
    it("returns null when the playlist does not exist", async () => {
      vi.mocked(prisma.playlist.findUnique).mockResolvedValue(null);

      const repo = new PrismaPlaylistRepository();
      const result = await repo.findOne("nonexistent");

      expect(result).toBeNull();
    });

    it("returns a Playlist entity when found", async () => {
      vi.mocked(prisma.playlist.findUnique).mockResolvedValue(makeDbPlaylist() as any);

      const repo = new PrismaPlaylistRepository();
      const result = await repo.findOne("pl-1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("pl-1");
      expect(result!.name).toBe("Test Playlist");
    });
  });

  describe("save", () => {
    it("calls create with BigInt createdAt and returns mapped Playlist", async () => {
      const fixedNow = 1700000000000;
      vi.mocked(prisma.playlist.create).mockResolvedValue(
        makeDbPlaylist({ createdAt: BigInt(fixedNow) }) as any,
      );

      const repo = new PrismaPlaylistRepository();
      const result = await repo.save({
        id: "pl-new",
        name: "New Playlist",
        type: "playlist" as any,
        spotifyUrl: "https://open.spotify.com/playlist/new",
        subscribed: false,
        createdAt: fixedNow,
      });

      const createArg = vi.mocked(prisma.playlist.create).mock.calls[0][0];
      expect(typeof createArg.data.createdAt).toBe("bigint");
      expect(result.id).toBe("pl-1");
    });

    it("defaults spotifyUrl to empty string when not provided", async () => {
      vi.mocked(prisma.playlist.create).mockResolvedValue(makeDbPlaylist() as any);

      const repo = new PrismaPlaylistRepository();
      await repo.save({
        id: "pl-2",
        name: "Playlist",
        type: "playlist" as any,
        subscribed: false,
      } as any);

      const createArg = vi.mocked(prisma.playlist.create).mock.calls[0][0];
      expect(createArg.data.spotifyUrl).toBe("");
    });
  });

  describe("delete", () => {
    it("calls prisma.playlist.delete with the given id", async () => {
      vi.mocked(prisma.playlist.delete).mockResolvedValue(makeDbPlaylist() as any);

      const repo = new PrismaPlaylistRepository();
      await repo.delete("pl-1");

      expect(prisma.playlist.delete).toHaveBeenCalledWith({ where: { id: "pl-1" } });
    });
  });

  describe("mapToPlaylist", () => {
    it("maps tracks when they are present on the DB row", async () => {
      const dbRow = makeDbPlaylist({
        tracks: [
          {
            id: "tr-1",
            name: "Track One",
            artist: "Artist",
            album: null,
            albumYear: null,
            trackNumber: null,
            spotifyUrl: null,
            trackUrl: null,
            albumUrl: null,
            artists: null,
            youtubeUrl: null,
            status: "completed",
            error: null,
            createdAt: BigInt(1700000000000),
            completedAt: null,
            playlistId: "pl-1",
          },
        ],
      });
      vi.mocked(prisma.playlist.findUnique).mockResolvedValue(dbRow as any);

      const repo = new PrismaPlaylistRepository();
      const result = await repo.findOne("pl-1");

      expect(result!.tracks).toHaveLength(1);
      expect(result!.tracks![0].id).toBe("tr-1");
    });
  });
});
