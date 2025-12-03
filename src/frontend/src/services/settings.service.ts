import { SettingItem, SettingMetadata, SupportedAudioFormat } from "@spotiarr/shared";
import { httpClient } from "./httpClient";

export const settingsService = {
  getSettings: async (): Promise<SettingItem[]> => {
    const response = await httpClient.get<{ data: SettingItem[] }>("/settings");
    return response.data;
  },

  updateSettings: async (settings: Array<{ key: string; value: string }>): Promise<void> => {
    return httpClient.put<void>("/settings", { settings });
  },

  getSupportedFormats: async (): Promise<SupportedAudioFormat[]> => {
    const response = await httpClient.get<{ data: SupportedAudioFormat[] }>("/settings/formats");
    return response.data;
  },

  getSettingsMetadata: async (): Promise<Record<string, SettingMetadata>> => {
    const response = await httpClient.get<{ data: Record<string, SettingMetadata> }>(
      "/settings/metadata",
    );
    return response.data;
  },
};
