import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClearChatMessagesUseCase } from "./clear-chat-messages.use-case";

describe("ClearChatMessagesUseCase", () => {
  const repository = {
    clear: vi.fn(),
  };

  let useCase: ClearChatMessagesUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new ClearChatMessagesUseCase(repository as never);
  });

  it("delegates clearing to the repository and returns the deleted count", async () => {
    repository.clear.mockResolvedValue(5);

    const result = await useCase.execute();

    expect(repository.clear).toHaveBeenCalledOnce();
    expect(result).toEqual({ deleted: 5 });
  });

  it("returns { deleted: 0 } when no messages were stored", async () => {
    repository.clear.mockResolvedValue(0);

    const result = await useCase.execute();

    expect(result).toEqual({ deleted: 0 });
  });

  it("returns the exact count reported by the repository", async () => {
    repository.clear.mockResolvedValue(42);

    const result = await useCase.execute();

    expect(result.deleted).toBe(42);
  });

  it("propagates repository errors without swallowing them", async () => {
    repository.clear.mockRejectedValue(new Error("db failure"));

    await expect(useCase.execute()).rejects.toThrow("db failure");
  });
});
