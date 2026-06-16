export interface AiChatMessageContent {
  key: string;
  params?: Record<string, unknown>;
}

export interface AiChatMessageProps {
  id: string;
  role: "user" | "assistant";
  content: AiChatMessageContent;
  playlistId: string | null;
  errorCode: string | null;
  createdAt: number;
}

export class AiChatMessage {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: AiChatMessageContent;
  readonly playlistId: string | null;
  readonly errorCode: string | null;
  readonly createdAt: number;

  constructor(props: AiChatMessageProps) {
    this.id = props.id;
    this.role = props.role;
    this.content = props.content;
    this.playlistId = props.playlistId;
    this.errorCode = props.errorCode;
    this.createdAt = props.createdAt;
  }
}
