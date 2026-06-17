import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiChatMessage } from "@/domain/entities/ai-chat-message.entity";
import {
  AppendChatMessageUseCase,
  type AppendChatMessageInput,
} from "./append-chat-message.use-case";

describe("AppendChatMessageUseCase", () => {
  const repository = {
    append: vi.fn().mockResolvedValue(undefined),
  };

  let useCase: AppendChatMessageUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new AppendChatMessageUseCase(repository as never);
  });

  describe("success path", () => {
    it("creates an AiChatMessage and appends it to the repository", async () => {
      const input: AppendChatMessageInput = {
        role: "user",
        contentKey: "chat.greet",
        contentParams: { name: "Alice" },
        playlistId: "playlist-99",
        errorCode: null,
      };

      await useCase.execute(input);

      expect(repository.append).toHaveBeenCalledOnce();
      const appended = repository.append.mock.calls[0][0] as AiChatMessage;
      expect(appended).toBeInstanceOf(AiChatMessage);
      expect(appended.role).toBe("user");
      expect(appended.content.key).toBe("chat.greet");
      expect(appended.content.params).toEqual({ name: "Alice" });
      expect(appended.playlistId).toBe("playlist-99");
      expect(appended.errorCode).toBeNull();
    });

    it("assigns a non-empty uuid as the message id", async () => {
      const input: AppendChatMessageInput = {
        role: "assistant",
        contentKey: "chat.response",
      };

      await useCase.execute(input);

      const appended = repository.append.mock.calls[0][0] as AiChatMessage;
      expect(typeof appended.id).toBe("string");
      expect(appended.id.length).toBeGreaterThan(0);
    });

    it("sets createdAt to a recent epoch millisecond timestamp", async () => {
      const before = Date.now();
      const input: AppendChatMessageInput = {
        role: "user",
        contentKey: "chat.ping",
      };

      await useCase.execute(input);

      const after = Date.now();
      const appended = repository.append.mock.calls[0][0] as AiChatMessage;
      expect(appended.createdAt).toBeGreaterThanOrEqual(before);
      expect(appended.createdAt).toBeLessThanOrEqual(after);
    });
  });

  describe("optional fields default handling", () => {
    it("defaults playlistId to null when not provided", async () => {
      await useCase.execute({ role: "user", contentKey: "chat.hello" });

      const appended = repository.append.mock.calls[0][0] as AiChatMessage;
      expect(appended.playlistId).toBeNull();
    });

    it("defaults errorCode to null when not provided", async () => {
      await useCase.execute({ role: "user", contentKey: "chat.hello" });

      const appended = repository.append.mock.calls[0][0] as AiChatMessage;
      expect(appended.errorCode).toBeNull();
    });

    it("coerces undefined playlistId to null", async () => {
      await useCase.execute({ role: "assistant", contentKey: "chat.reply", playlistId: undefined });

      const appended = repository.append.mock.calls[0][0] as AiChatMessage;
      expect(appended.playlistId).toBeNull();
    });

    it("coerces undefined errorCode to null", async () => {
      await useCase.execute({ role: "user", contentKey: "chat.err", errorCode: undefined });

      const appended = repository.append.mock.calls[0][0] as AiChatMessage;
      expect(appended.errorCode).toBeNull();
    });
  });

  describe("role variants", () => {
    it("persists role=user correctly", async () => {
      await useCase.execute({ role: "user", contentKey: "k" });
      const appended = repository.append.mock.calls[0][0] as AiChatMessage;
      expect(appended.role).toBe("user");
    });

    it("persists role=assistant correctly", async () => {
      await useCase.execute({ role: "assistant", contentKey: "k" });
      const appended = repository.append.mock.calls[0][0] as AiChatMessage;
      expect(appended.role).toBe("assistant");
    });
  });

  it("propagates repository errors without swallowing them", async () => {
    repository.append.mockRejectedValue(new Error("storage failure"));

    await expect(useCase.execute({ role: "user", contentKey: "chat.ping" })).rejects.toThrow(
      "storage failure",
    );
  });
});
