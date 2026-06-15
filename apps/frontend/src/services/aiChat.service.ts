import { ApiRoutes, type GenerateAiPlaylistResponse } from "@spotiarr/shared";
import { httpClient } from "./httpClient";

export interface ModelOverrides {
  provider?: string;
  baseURL?: string;
  apiKey?: string;
}

export const aiChatService = {
  generate: async (prompt: string): Promise<GenerateAiPlaylistResponse> => {
    const response = await httpClient.post<{ data: GenerateAiPlaylistResponse }>(
      `${ApiRoutes.AI}/chat/generate`,
      { prompt },
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
};
