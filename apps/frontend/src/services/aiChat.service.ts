import { ApiRoutes, type GenerateAiPlaylistResponse } from "@spotiarr/shared";
import { httpClient } from "./httpClient";

export const aiChatService = {
  generate: async (prompt: string): Promise<GenerateAiPlaylistResponse> => {
    const response = await httpClient.post<{ data: GenerateAiPlaylistResponse }>(
      `${ApiRoutes.AI}/chat/generate`,
      { prompt },
    );
    return response.data;
  },

  getModels: async (): Promise<string[]> => {
    const response = await httpClient.get<{ data: { models: string[] } }>(`${ApiRoutes.AI}/models`);
    return response.data.models;
  },
};
