export type AiChatErrorCode = "provider-misconfig" | "provider-unreachable" | "llm-bad-output";

export class AiChatError extends Error {
  constructor(
    public readonly code: AiChatErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    Object.setPrototypeOf(this, AiChatError.prototype);
  }
}
