import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiChatMessage } from "@/domain/entities/ai-chat-message.entity";
import { GetChatMessagesUseCase } from "./get-chat-messages.use-case";

const makeMessage = (overrides: Partial<ConstructorParameters<typeof AiChatMessage>[0]> = {}): AiChatMessage =>
  new AiChatMessage({
    id: "msg-1",
    role: "user",
    content: { key: "chat.hello", params: undefined },
    playlistId: null,
    errorCode: null,
    createdAt: 1_000_000,
    ...overrides,
  });

describe("GetChatMessagesUseCase", () => {
  const repository = {
    list: vi.fn(),
  };

  let useCase: GetChatMessagesUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new GetChatMessagesUseCase(repository as never);
  });

  it("returns an empty array when the repository has no messages", async () => {
    repository.list.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });

  it("maps each AiChatMessage entity to an AiChatMessageDto", async () => {
    const entity = makeMessage({
      id: "msg-42",
      role: "assistant",
      content: { key: "chat.response", params: { count: 3 } },
      playlistId: "playlist-1",
      errorCode: "some_error",
      createdAt: 9_999_999,
    });
    repository.list.mockResolvedValue([entity]);

    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "msg-42",
      role: "assistant",
      content: { key: "chat.response", params: { count: 3 } },
      playlistId: "playlist-1",
      errorCode: "some_error",
      createdAt: 9_999_999,
    });
  });

  it("preserves order of messages returned by the repository", async () => {
    const entities = [
      makeMessage({ id: "msg-1", createdAt: 1000 }),
      makeMessage({ id: "msg-2", createdAt: 2000 }),
      makeMessage({ id: "msg-3", createdAt: 3000 }),
    ];
    repository.list.mockResolvedValue(entities);

    const result = await useCase.execute();

    expect(result.map((m) => m.id)).toEqual(["msg-1", "msg-2", "msg-3"]);
  });

  it("maps all entity fields to the DTO (id, role, content, playlistId, errorCode, createdAt)", async () => {
    const entity = makeMessage({ id: "msg-99", role: "user" });
    repository.list.mockResolvedValue([entity]);

    const result = await useCase.execute();
    const dto = result[0];

    expect(dto).toHaveProperty("id");
    expect(dto).toHaveProperty("role");
    expect(dto).toHaveProperty("content");
    expect(dto).toHaveProperty("playlistId");
    expect(dto).toHaveProperty("errorCode");
    expect(dto).toHaveProperty("createdAt");
  });

  it("maps multiple messages correctly", async () => {
    const entities = [
      makeMessage({ id: "a", role: "user" }),
      makeMessage({ id: "b", role: "assistant" }),
    ];
    repository.list.mockResolvedValue(entities);

    const result = await useCase.execute();

    expect(result[0].id).toBe("a");
    expect(result[0].role).toBe("user");
    expect(result[1].id).toBe("b");
    expect(result[1].role).toBe("assistant");
  });

  it("propagates repository errors without swallowing them", async () => {
    repository.list.mockRejectedValue(new Error("db failure"));

    await expect(useCase.execute()).rejects.toThrow("db failure");
  });
});
