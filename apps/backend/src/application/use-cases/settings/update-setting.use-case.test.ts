import * as fsMock from "fs";
import * as pathMock from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MASKED_SENTINEL } from "./get-settings.use-case";
import { UpdateSettingUseCase } from "./update-setting.use-case";

vi.mock("fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock("path", () => ({
  join: vi.fn(),
}));

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

describe("UpdateSettingUseCase — YT_COOKIES branch", () => {
  beforeEach(() => {
    vi.mocked(pathMock.join)
      .mockReturnValueOnce("/fake/config") // configDir = path.join(cwd, "config")
      .mockReturnValueOnce("/fake/config/cookies.txt"); // cookiePath = path.join(configDir, "cookies.txt")
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes cookies file when value contains newline and sets repository value to file path", async () => {
    vi.mocked(fsMock.existsSync).mockReturnValue(true);
    const { repository, spotifyUserLibraryService, eventBus } = makeStubs();
    const useCase = new UpdateSettingUseCase(repository, spotifyUserLibraryService, eventBus);
    const cookieContent = "# Netscape HTTP Cookie File\nfoo=bar\nbaz=qux";

    await useCase.execute("YT_COOKIES", cookieContent);

    expect(fsMock.writeFileSync).toHaveBeenCalledWith(
      "/fake/config/cookies.txt",
      cookieContent,
      "utf-8",
    );
    expect(repository.set).toHaveBeenCalledWith("YT_COOKIES", "/fake/config/cookies.txt");
    expect(eventBus.emit).toHaveBeenCalledWith("settings:updated", {
      key: "YT_COOKIES",
      value: "/fake/config/cookies.txt",
    });
  });

  it("writes cookies file when value starts with hash (# comment) and sets repository value to file path", async () => {
    vi.mocked(fsMock.existsSync).mockReturnValue(true);
    vi.mocked(pathMock.join)
      .mockReset()
      .mockReturnValueOnce("/fake/config")
      .mockReturnValueOnce("/fake/config/cookies.txt");
    const { repository, spotifyUserLibraryService, eventBus } = makeStubs();
    const useCase = new UpdateSettingUseCase(repository, spotifyUserLibraryService, eventBus);
    const cookieContent = "# Netscape HTTP Cookie File\nfoo=bar";

    await useCase.execute("YT_COOKIES", cookieContent);

    expect(fsMock.writeFileSync).toHaveBeenCalledWith(
      "/fake/config/cookies.txt",
      cookieContent,
      "utf-8",
    );
    expect(repository.set).toHaveBeenCalledWith("YT_COOKIES", "/fake/config/cookies.txt");
  });

  it("does NOT write file and passes raw path through when value is a plain path", async () => {
    const { repository, spotifyUserLibraryService, eventBus } = makeStubs();
    const useCase = new UpdateSettingUseCase(repository, spotifyUserLibraryService, eventBus);

    await useCase.execute("YT_COOKIES", "/etc/cookies.txt");

    expect(fsMock.writeFileSync).not.toHaveBeenCalled();
    expect(repository.set).toHaveBeenCalledWith("YT_COOKIES", "/etc/cookies.txt");
  });

  it("does NOT call mkdirSync when configDir already exists", async () => {
    vi.mocked(fsMock.existsSync).mockReturnValue(true);
    vi.mocked(pathMock.join)
      .mockReset()
      .mockReturnValueOnce("/fake/config")
      .mockReturnValueOnce("/fake/config/cookies.txt");
    const { repository, spotifyUserLibraryService, eventBus } = makeStubs();
    const useCase = new UpdateSettingUseCase(repository, spotifyUserLibraryService, eventBus);

    await useCase.execute("YT_COOKIES", "line1\nline2");

    expect(fsMock.mkdirSync).not.toHaveBeenCalled();
    expect(fsMock.writeFileSync).toHaveBeenCalled();
  });

  it("calls mkdirSync with recursive:true when configDir does not exist", async () => {
    vi.mocked(fsMock.existsSync).mockReturnValue(false);
    vi.mocked(pathMock.join)
      .mockReset()
      .mockReturnValueOnce("/fake/config")
      .mockReturnValueOnce("/fake/config/cookies.txt");
    const { repository, spotifyUserLibraryService, eventBus } = makeStubs();
    const useCase = new UpdateSettingUseCase(repository, spotifyUserLibraryService, eventBus);

    await useCase.execute("YT_COOKIES", "line1\nline2");

    expect(fsMock.mkdirSync).toHaveBeenCalledWith("/fake/config", { recursive: true });
    expect(fsMock.writeFileSync).toHaveBeenCalled();
  });
});
