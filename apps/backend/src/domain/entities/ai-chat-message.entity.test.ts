import { describe, expect, it } from "vitest";
import { AiChatMessage, type AiChatMessageProps } from "./ai-chat-message.entity";

function makeProps(overrides: Partial<AiChatMessageProps> = {}): AiChatMessageProps {
  return {
    id: "msg-1",
    role: "user",
    content: { key: "hello" },
    playlistId: null,
    errorCode: null,
    createdAt: 1700000000000,
    ...overrides,
  };
}

describe("AiChatMessage constructor", () => {
  it("maps all props correctly", () => {
    const props = makeProps({
      id: "msg-42",
      role: "assistant",
      content: { key: "response", params: { name: "Alice" } },
      playlistId: "playlist-1",
      errorCode: "internal_server_error",
      createdAt: 1234567890,
    });
    const msg = new AiChatMessage(props);

    expect(msg.id).toBe("msg-42");
    expect(msg.role).toBe("assistant");
    expect(msg.content).toEqual({ key: "response", params: { name: "Alice" } });
    expect(msg.playlistId).toBe("playlist-1");
    expect(msg.errorCode).toBe("internal_server_error");
    expect(msg.createdAt).toBe(1234567890);
  });

  it("stores null for playlistId and errorCode when not provided", () => {
    const msg = new AiChatMessage(makeProps({ playlistId: null, errorCode: null }));

    expect(msg.playlistId).toBeNull();
    expect(msg.errorCode).toBeNull();
  });

  it("accepts role 'user'", () => {
    const msg = new AiChatMessage(makeProps({ role: "user" }));
    expect(msg.role).toBe("user");
  });

  it("accepts role 'assistant'", () => {
    const msg = new AiChatMessage(makeProps({ role: "assistant" }));
    expect(msg.role).toBe("assistant");
  });

  it("stores content without params", () => {
    const msg = new AiChatMessage(makeProps({ content: { key: "simple" } }));
    expect(msg.content).toEqual({ key: "simple" });
    expect(msg.content.params).toBeUndefined();
  });

  it("stores content with params", () => {
    const msg = new AiChatMessage(
      makeProps({ content: { key: "greeting", params: { user: "Bob", count: 3 } } }),
    );
    expect(msg.content.key).toBe("greeting");
    expect(msg.content.params).toEqual({ user: "Bob", count: 3 });
  });
});
