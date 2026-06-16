import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/domain/errors/app-error";
import type { EventBus } from "@/domain/events/event-bus";
import type { PlaylistRepository } from "@/domain/repositories/playlist.repository";
import { DeletePlaylistUseCase } from "./delete-playlist.use-case";

const makeDeps = () => {
  const playlistRepository: Pick<PlaylistRepository, "findOne" | "delete"> = {
    findOne: vi.fn(),
    delete: vi.fn(),
  };
  const eventBus: EventBus = {
    emit: vi.fn(),
  };
  return { playlistRepository, eventBus };
};

const makeUseCase = (
  playlistRepository: Pick<PlaylistRepository, "findOne" | "delete">,
  eventBus: EventBus,
) =>
  new DeletePlaylistUseCase(
    playlistRepository as unknown as PlaylistRepository,
    eventBus,
  );

describe("DeletePlaylistUseCase", () => {
  it("deletes the playlist and emits playlists-updated when found", async () => {
    const { playlistRepository, eventBus } = makeDeps();
    vi.mocked(playlistRepository.findOne).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(playlistRepository.delete).mockResolvedValue(undefined);

    const useCase = makeUseCase(playlistRepository, eventBus);
    await useCase.execute("p1");

    expect(playlistRepository.findOne).toHaveBeenCalledWith("p1");
    expect(playlistRepository.delete).toHaveBeenCalledWith("p1");
    expect(eventBus.emit).toHaveBeenCalledWith("playlists-updated");
  });

  it("throws AppError 404 when playlist is not found", async () => {
    const { playlistRepository, eventBus } = makeDeps();
    vi.mocked(playlistRepository.findOne).mockResolvedValue(null);

    const useCase = makeUseCase(playlistRepository, eventBus);

    await expect(useCase.execute("missing")).rejects.toThrow(AppError);
    await expect(useCase.execute("missing")).rejects.toMatchObject({
      statusCode: 404,
      errorCode: "playlist_not_found",
    });
  });

  it("does not delete or emit when playlist is not found", async () => {
    const { playlistRepository, eventBus } = makeDeps();
    vi.mocked(playlistRepository.findOne).mockResolvedValue(null);

    const useCase = makeUseCase(playlistRepository, eventBus);
    await expect(useCase.execute("missing")).rejects.toThrow();

    expect(playlistRepository.delete).not.toHaveBeenCalled();
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it("propagates repository findOne errors", async () => {
    const { playlistRepository, eventBus } = makeDeps();
    vi.mocked(playlistRepository.findOne).mockRejectedValue(new Error("db error"));

    const useCase = makeUseCase(playlistRepository, eventBus);

    await expect(useCase.execute("p1")).rejects.toThrow("db error");
    expect(playlistRepository.delete).not.toHaveBeenCalled();
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it("propagates repository delete errors", async () => {
    const { playlistRepository, eventBus } = makeDeps();
    vi.mocked(playlistRepository.findOne).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(playlistRepository.delete).mockRejectedValue(new Error("delete failed"));

    const useCase = makeUseCase(playlistRepository, eventBus);

    await expect(useCase.execute("p1")).rejects.toThrow("delete failed");
    expect(eventBus.emit).not.toHaveBeenCalled();
  });
});
