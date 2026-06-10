import { describe, expect, it, vi } from "vitest";
import { MASKED_SENTINEL } from "./get-settings.use-case";
import { UpdateSettingUseCase } from "./update-setting.use-case";

function makeStubs() {
  const repository = {
    findAll: vi.fn(),
    get: vi.fn(),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn(),
  };
  const spotifyUserLibraryService = { clearCache: vi.fn(), getFollowedArtists: vi.fn() };
  const eventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
  return { repository, spotifyUserLibraryService, eventBus };
}

describe("UpdateSettingUseCase — masked sentinel guard", () => {
  it("does NOT call repository.set when value is the masked sentinel", async () => {
    const { repository, spotifyUserLibraryService, eventBus } = makeStubs();
    const useCase = new UpdateSettingUseCase(repository, spotifyUserLibraryService, eventBus);

    await useCase.execute("AI_API_KEY", MASKED_SENTINEL);

    expect(repository.set).not.toHaveBeenCalled();
  });

  it("DOES call repository.set when value is a real (non-sentinel) value", async () => {
    const { repository, spotifyUserLibraryService, eventBus } = makeStubs();
    const useCase = new UpdateSettingUseCase(repository, spotifyUserLibraryService, eventBus);

    await useCase.execute("AI_API_KEY", "sk-new-key");

    expect(repository.set).toHaveBeenCalledWith("AI_API_KEY", "sk-new-key");
  });

  it("DOES call repository.set for non-secret keys regardless of value", async () => {
    const { repository, spotifyUserLibraryService, eventBus } = makeStubs();
    const useCase = new UpdateSettingUseCase(repository, spotifyUserLibraryService, eventBus);

    await useCase.execute("AI_MODEL", "gpt-4o");

    expect(repository.set).toHaveBeenCalledWith("AI_MODEL", "gpt-4o");
  });

  it("does not emit settings:updated when sentinel is ignored", async () => {
    const { repository, spotifyUserLibraryService, eventBus } = makeStubs();
    const useCase = new UpdateSettingUseCase(repository, spotifyUserLibraryService, eventBus);

    await useCase.execute("AI_API_KEY", MASKED_SENTINEL);

    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it("emits settings:updated when a real value is saved", async () => {
    const { repository, spotifyUserLibraryService, eventBus } = makeStubs();
    const useCase = new UpdateSettingUseCase(repository, spotifyUserLibraryService, eventBus);

    await useCase.execute("AI_API_KEY", "sk-new-key");

    expect(eventBus.emit).toHaveBeenCalledWith("settings:updated", {
      key: "AI_API_KEY",
      value: "sk-new-key",
    });
  });
});
