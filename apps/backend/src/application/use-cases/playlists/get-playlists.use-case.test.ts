import type { IPlaylist } from "@spotiarr/shared";
import { describe, expect, it, vi } from "vitest";
import { Playlist } from "@/domain/entities/playlist.entity";
import type { PlaylistRepository } from "@/domain/repositories/playlist.repository";
import { GetPlaylistsUseCase } from "./get-playlists.use-case";

const makePlaylist = (overrides: Partial<IPlaylist> = {}): Playlist => {
  const props: IPlaylist = {
    id: "p1",
    name: "My Playlist",
    spotifyUrl: "https://open.spotify.com/playlist/abc",
    subscribed: true,
    tracks: [],
    ...overrides,
  };
  return new Playlist(props);
};

const makeDeps = () => {
  const playlistRepository: Pick<PlaylistRepository, "findAll" | "findOne"> = {
    findAll: vi.fn(),
    findOne: vi.fn(),
  };
  return { playlistRepository };
};

const makeUseCase = (playlistRepository: Pick<PlaylistRepository, "findAll" | "findOne">) =>
  new GetPlaylistsUseCase(playlistRepository as unknown as PlaylistRepository);

describe("GetPlaylistsUseCase", () => {
  describe("findAll", () => {
    it("returns primitives of all playlists with default params", async () => {
      const { playlistRepository } = makeDeps();
      const playlist = makePlaylist();
      vi.mocked(playlistRepository.findAll).mockResolvedValue([playlist]);

      const useCase = makeUseCase(playlistRepository);
      const result = await useCase.findAll();

      expect(playlistRepository.findAll).toHaveBeenCalledWith(true, undefined);
      expect(result).toEqual([playlist.toPrimitive()]);
    });

    it("passes includesTracks=false through to repository", async () => {
      const { playlistRepository } = makeDeps();
      vi.mocked(playlistRepository.findAll).mockResolvedValue([]);

      const useCase = makeUseCase(playlistRepository);
      await useCase.findAll(false);

      expect(playlistRepository.findAll).toHaveBeenCalledWith(false, undefined);
    });

    it("passes where filter through to repository", async () => {
      const { playlistRepository } = makeDeps();
      vi.mocked(playlistRepository.findAll).mockResolvedValue([]);

      const useCase = makeUseCase(playlistRepository);
      await useCase.findAll(true, { subscribed: true });

      expect(playlistRepository.findAll).toHaveBeenCalledWith(true, { subscribed: true });
    });

    it("returns empty array when repository returns none", async () => {
      const { playlistRepository } = makeDeps();
      vi.mocked(playlistRepository.findAll).mockResolvedValue([]);

      const useCase = makeUseCase(playlistRepository);
      const result = await useCase.findAll();

      expect(result).toEqual([]);
    });

    it("returns multiple playlists mapped to primitives", async () => {
      const { playlistRepository } = makeDeps();
      const p1 = makePlaylist({ id: "p1", name: "A" });
      const p2 = makePlaylist({ id: "p2", name: "B" });
      vi.mocked(playlistRepository.findAll).mockResolvedValue([p1, p2]);

      const useCase = makeUseCase(playlistRepository);
      const result = await useCase.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(p1.toPrimitive());
      expect(result[1]).toEqual(p2.toPrimitive());
    });

    it("propagates repository errors", async () => {
      const { playlistRepository } = makeDeps();
      vi.mocked(playlistRepository.findAll).mockRejectedValue(new Error("db error"));

      const useCase = makeUseCase(playlistRepository);

      await expect(useCase.findAll()).rejects.toThrow("db error");
    });
  });

  describe("findOne", () => {
    it("returns primitive of found playlist", async () => {
      const { playlistRepository } = makeDeps();
      const playlist = makePlaylist({ id: "p1" });
      vi.mocked(playlistRepository.findOne).mockResolvedValue(playlist);

      const useCase = makeUseCase(playlistRepository);
      const result = await useCase.findOne("p1");

      expect(playlistRepository.findOne).toHaveBeenCalledWith("p1");
      expect(result).toEqual(playlist.toPrimitive());
    });

    it("returns null when playlist is not found", async () => {
      const { playlistRepository } = makeDeps();
      vi.mocked(playlistRepository.findOne).mockResolvedValue(null);

      const useCase = makeUseCase(playlistRepository);
      const result = await useCase.findOne("missing");

      expect(result).toBeNull();
    });

    it("propagates repository errors", async () => {
      const { playlistRepository } = makeDeps();
      vi.mocked(playlistRepository.findOne).mockRejectedValue(new Error("db error"));

      const useCase = makeUseCase(playlistRepository);

      await expect(useCase.findOne("p1")).rejects.toThrow("db error");
    });
  });
});
