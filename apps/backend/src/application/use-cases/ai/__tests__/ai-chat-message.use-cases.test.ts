import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AiChatMessage } from "@/domain/entities/ai-chat-message.entity";
import type { AiChatMessageRepository } from "@/domain/repositories/ai-chat-message.repository";
import { AppendChatMessageUseCase } from "../append-chat-message.use-case";
import { ClearChatMessagesUseCase } from "../clear-chat-messages.use-case";
import { GetChatMessagesUseCase } from "../get-chat-messages.use-case";

function makeRepo(overrides: Partial<AiChatMessageRepository> = {}): AiChatMessageRepository {
  return {
    append: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
    clear: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

describe("AppendChatMessageUseCase", () => {
  beforeEach(() => vi.clearAllMocks());

  it("S-B-01: appends user message and calls repository.append once", async () => {
    const repo = makeRepo();
    const useCase = new AppendChatMessageUseCase(repo);

    await useCase.execute({
      role: "user",
      contentKey: "aiChat.userPrompt",
      contentParams: { prompt: "jazz" },
    });

    expect(repo.append).toHaveBeenCalledOnce();
    const entity = (repo.append as ReturnType<typeof vi.fn>).mock.calls[0][0] as AiChatMessage;
    expect(entity.role).toBe("user");
    expect(entity.content.key).toBe("aiChat.userPrompt");
    expect(entity.content.params).toMatchObject({ prompt: "jazz" });
    expect(entity.id).toBeTruthy();
    expect(entity.id.length).toBeGreaterThan(0);
    expect(entity.createdAt).toBeGreaterThan(0);
  });

  it("S-B-02: appends assistant done message with playlistId and errorCode=null", async () => {
    const repo = makeRepo();
    const useCase = new AppendChatMessageUseCase(repo);

    await useCase.execute({
      role: "assistant",
      contentKey: "aiChat.assistantDone",
      contentParams: { count: 12 },
      playlistId: "p-1",
    });

    expect(repo.append).toHaveBeenCalledOnce();
    const entity = (repo.append as ReturnType<typeof vi.fn>).mock.calls[0][0] as AiChatMessage;
    expect(entity.role).toBe("assistant");
    expect(entity.playlistId).toBe("p-1");
    expect(entity.errorCode).toBeNull();
  });

  it("S-B-03: appends assistant error message with errorCode and playlistId=null", async () => {
    const repo = makeRepo();
    const useCase = new AppendChatMessageUseCase(repo);

    await useCase.execute({
      role: "assistant",
      contentKey: "aiChat.assistantError",
      contentParams: { code: "zero-resolved" },
      errorCode: "zero-resolved",
    });

    expect(repo.append).toHaveBeenCalledOnce();
    const entity = (repo.append as ReturnType<typeof vi.fn>).mock.calls[0][0] as AiChatMessage;
    expect(entity.role).toBe("assistant");
    expect(entity.errorCode).toBe("zero-resolved");
    expect(entity.playlistId).toBeNull();
  });
});

describe("GetChatMessagesUseCase", () => {
  beforeEach(() => vi.clearAllMocks());

  it("S-B-04: returns empty array when thread is empty", async () => {
    const repo = makeRepo({ list: vi.fn().mockResolvedValue([]) });
    const useCase = new GetChatMessagesUseCase(repo);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });

  it("S-B-05: maps domain entities to DTOs", async () => {
    const entity: AiChatMessage = {
      id: "m1",
      role: "user",
      content: { key: "aiChat.userPrompt" },
      playlistId: null,
      errorCode: null,
      createdAt: 1000,
    };
    const repo = makeRepo({ list: vi.fn().mockResolvedValue([entity]) });
    const useCase = new GetChatMessagesUseCase(repo);

    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "m1",
      role: "user",
      content: { key: "aiChat.userPrompt" },
      playlistId: null,
      errorCode: null,
      createdAt: 1000,
    });
  });
});

describe("ClearChatMessagesUseCase", () => {
  beforeEach(() => vi.clearAllMocks());

  it("S-B-06: returns deleted count from repository", async () => {
    const repo = makeRepo({ clear: vi.fn().mockResolvedValue(5) });
    const useCase = new ClearChatMessagesUseCase(repo);

    const result = await useCase.execute();

    expect(result).toEqual({ deleted: 5 });
  });

  it("S-B-07: returns zero when thread is empty (no error)", async () => {
    const repo = makeRepo({ clear: vi.fn().mockResolvedValue(0) });
    const useCase = new ClearChatMessagesUseCase(repo);

    const result = await useCase.execute();

    expect(result).toEqual({ deleted: 0 });
  });
});
