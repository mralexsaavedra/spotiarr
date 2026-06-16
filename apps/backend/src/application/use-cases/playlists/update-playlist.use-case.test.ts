import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/domain/errors/app-error";
import type { EventBus } from "@/domain/events/event-bus";
import type { PlaylistRepository } from "@/domain/repositories/playlist.repository";
import { UpdatePlaylistUseCase } from "./update-playlist.use-case";

const makeDeps = () => {
  const playlistRepository: Pick<PlaylistRepository, "findOne" | "update"> = {
    findOne: vi.fn(),
    update: vi.fn(),
  };
  const eventBus: EventBus = {
    emit: vi.fn(),
  };
  return { playlistRepository, eventBus };
};

const makeUseCase = (
  playlistRepository: Pick<PlaylistRepository, "findOne" | "update">,
  eventBus: EventBus,
) =>
  new UpdatePlaylistUseCase(
    playlistRepository as unknown as PlaylistRepository,
    eventBus,
  );

describe("UpdatePlaylistUseCase", () => {
  it("updates the playlist and emits playlists-updated when found", async () => {
    const { playlistRepository, eventBus } = makeDeps();
    vi.mocked(playlistRepository.findOne).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(playlistRepository.update).mockResolvedValue(undefined);

    const useCase = makeUseCase(playlistRepository, eventBus);
    await useCase.execute("p1", { name: "New Name" });

    expect(playlistRepository.findOne).toHaveBeenCalledWith("p1");
    expect(playlistRepository.update).toHaveBeenCalledWith("p1", { name: "New Name" });
    expect(eventBus.emit).toHaveBeenCalledWith("playlists-updated");
  });

  it("throws AppError 404 when playlist is not found", async () => {
    const { playlistRepository, eventBus } = makeDeps();
    vi.mocked(playlistRepository.findOne).mockResolvedValue(null);

    const useCase = makeUseCase(playlistRepository, eventBus);

    await expect(useCase.execute("missing", {})).rejects.toThrow(AppError);
    await expect(useCase.execute("missing", {})).rejects.toMatchObject({
      statusCode: 404,
      errorCode: "playlist_not_found",
    });
  });

  it("does not call update or emit when playlist is not found", async () => {
    const { playlistRepository, eventBus } = makeDeps();
    vi.mocked(playlistRepository.findOne).mockResolvedValue(null);

    const useCase = makeUseCase(playlistRepository, eventBus);
    await expect(useCase.execute("missing", {})).rejects.toThrow();

    expect(playlistRepository.update).not.toHaveBeenCalled();
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it("propagates repository findOne errors", async () => {
    const { playlistRepository, eventBus } = makeDeps();
    vi.mocked(playlistRepository.findOne).mockRejectedValue(new Error("db error"));

    const useCase = makeUseCase(playlistRepository, eventBus);

    await expect(useCase.execute("p1", { name: "X" })).rejects.toThrow("db error");
    expect(playlistRepository.update).not.toHaveBeenCalled();
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it("propagates repository update errors without emitting", async () => {
    const { playlistRepository, eventBus } = makeDeps();
    vi.mocked(playlistRepository.findOne).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(playlistRepository.update).mockRejectedValue(new Error("update failed"));

    const useCase = makeUseCase(playlistRepository, eventBus);

    await expect(useCase.execute("p1", { name: "X" })).rejects.toThrow("update failed");
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it("passes partial playlist data through to repository", async () => {
    const { playlistRepository, eventBus } = makeDeps();
    vi.mocked(playlistRepository.findOne).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(playlistRepository.update).mockResolvedValue(undefined);

    const patch = { name: "Updated", subscribed: false };
    const useCase = makeUseCase(playlistRepository, eventBus);
    await useCase.execute("p1", patch);

    expect(playlistRepository.update).toHaveBeenCalledWith("p1", patch);
  });
});
