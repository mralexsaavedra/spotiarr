import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Track } from "@/domain/entities/track.entity";
import { CreateTrackUseCase } from "./create-track.use-case";

const makeTrack = (overrides: Partial<ITrack> = {}): ITrack => ({
  id: "track-1",
  name: "Song A",
  artist: "Artist A",
  status: TrackStatusEnum.New,
  playlistId: "playlist-1",
  youtubeUrl: undefined,
  spotifyUrl: undefined,
  trackUrl: undefined,
  searchAttempts: 0,
  ...overrides,
});

describe("CreateTrackUseCase", () => {
  const trackRepository = {
    save: vi.fn(),
  };

  const queueService = {
    enqueueSearchTrack: vi.fn().mockResolvedValue(undefined),
  };

  let useCase: CreateTrackUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new CreateTrackUseCase(trackRepository as never, queueService as never);
  });

  it("saves the track to the repository and enqueues it for search", async () => {
    const input = makeTrack();
    const savedTrack = new Track(input);
    trackRepository.save.mockResolvedValue(savedTrack);

    await useCase.execute(input);

    expect(trackRepository.save).toHaveBeenCalledWith(input);
    expect(queueService.enqueueSearchTrack).toHaveBeenCalledWith(savedTrack.toPrimitive());
  });

  it("passes the primitive representation of the saved track to the queue service", async () => {
    const input = makeTrack({ id: "track-2", name: "Song B" });
    const savedTrack = new Track(input);
    trackRepository.save.mockResolvedValue(savedTrack);

    await useCase.execute(input);

    const enqueueArg = queueService.enqueueSearchTrack.mock.calls[0][0];
    expect(enqueueArg).toEqual(savedTrack.toPrimitive());
    expect(enqueueArg.id).toBe("track-2");
    expect(enqueueArg.name).toBe("Song B");
  });

  it("propagates repository errors without swallowing them", async () => {
    trackRepository.save.mockRejectedValue(new Error("db failure"));

    await expect(useCase.execute(makeTrack())).rejects.toThrow("db failure");
    expect(queueService.enqueueSearchTrack).not.toHaveBeenCalled();
  });

  it("propagates queue service errors without swallowing them", async () => {
    const savedTrack = new Track(makeTrack());
    trackRepository.save.mockResolvedValue(savedTrack);
    queueService.enqueueSearchTrack.mockRejectedValue(new Error("queue failure"));

    await expect(useCase.execute(makeTrack())).rejects.toThrow("queue failure");
  });
});
