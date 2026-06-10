import { describe, expect, it } from "vitest";
import { AiChatError, type AiChatErrorCode } from "./ai-chat.error";

describe("AiChatError", () => {
  it.each([
    "provider-misconfig",
    "provider-unreachable",
    "llm-bad-output",
  ] satisfies AiChatErrorCode[])("constructs with code %s", (code) => {
    const err = new AiChatError(code, "test message");
    expect(err.code).toBe(code);
    expect(err.message).toBe("test message");
    expect(err).toBeInstanceOf(Error);
  });

  it("uses code as message when message omitted", () => {
    const err = new AiChatError("provider-misconfig");
    expect(err.message).toBe("provider-misconfig");
  });

  it("is identifiable by instanceof", () => {
    const err = new AiChatError("llm-bad-output");
    expect(err instanceof AiChatError).toBe(true);
  });
});
