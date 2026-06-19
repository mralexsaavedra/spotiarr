import {
  ApiRoutes,
  type AiChatHistoryDto,
  type ClearChatMessagesResponseDto,
  type GenerateAiPlaylistResponse,
  type ListeningScope,
} from "@spotiarr/shared";
import { httpClient } from "./httpClient";

export interface ModelOverrides {
  provider?: string;
  baseURL?: string;
  apiKey?: string;
}

export const aiChatService = {
  generate: async (
    prompt: string,
    listeningIntent?: ListeningScope,
  ): Promise<GenerateAiPlaylistResponse> => {
    const body: Record<string, unknown> = { prompt };
    if (listeningIntent) {
      body.listeningIntent = listeningIntent;
    }
    const response = await httpClient.post<{ data: GenerateAiPlaylistResponse }>(
      `${ApiRoutes.AI}/chat/generate`,
      body,
    );
    return response.data;
  },

  getModels: async (overrides: ModelOverrides = {}): Promise<string[]> => {
    const response = await httpClient.post<{ data: { models: string[] } }>(
      `${ApiRoutes.AI}/models`,
      overrides,
    );
    return response.data.models;
  },

  getChatMessages: async (): Promise<AiChatHistoryDto> => {
    const response = await httpClient.get<{ data: { messages: AiChatHistoryDto["messages"] } }>(
      `${ApiRoutes.AI}/chat/messages`,
    );
    return { messages: response.data.messages };
  },

  clearChatMessages: async (): Promise<ClearChatMessagesResponseDto> => {
    const response = await httpClient.delete<{ data: ClearChatMessagesResponseDto }>(
      `${ApiRoutes.AI}/chat/messages`,
    );
    return response.data;
  },
};
