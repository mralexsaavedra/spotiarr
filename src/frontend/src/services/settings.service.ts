import { ApiRoutes, SettingItem, SettingMetadata, SupportedAudioFormat } from "@spotiarr/shared";
import { httpClient } from "./httpClient";

export const settingsService = {
  getSettings: async (): Promise<SettingItem[]> => {
    const response = await httpClient.get<{ data: SettingItem[] }>(ApiRoutes.SETTINGS);
    return response.data;
  },

  updateSettings: async (settings: Array<{ key: string; value: string }>): Promise<void> => {
    return httpClient.put<void>(ApiRoutes.SETTINGS, { settings });
  },

  getSupportedFormats: async (): Promise<SupportedAudioFormat[]> => {
    const response = await httpClient.get<{ data: SupportedAudioFormat[] }>(
      `${ApiRoutes.SETTINGS}/formats`,
    );
    return response.data;
  },

  getSettingsMetadata: async (): Promise<Record<string, SettingMetadata>> => {
    const response = await httpClient.get<{ data: Record<string, SettingMetadata> }>(
      `${ApiRoutes.SETTINGS}/metadata`,
    );
    return response.data;
  },
};
