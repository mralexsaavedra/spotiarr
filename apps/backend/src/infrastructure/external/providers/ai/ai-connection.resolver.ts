import { AI_LOCAL_PROVIDERS, AI_PROVIDER_PRESETS, normalizeAiProvider } from "@spotiarr/shared";
import type { AiProvider } from "@spotiarr/shared";
import type { SettingsService } from "@/application/services/settings.service";
import { AiChatError } from "@/domain/errors/ai-chat.error";

export interface AiConnection {
  provider: AiProvider;
  baseURL: string;
  apiKey: string;
}

export async function resolveAiConnection(settingsService: SettingsService): Promise<AiConnection> {
  const [rawProvider, rawBaseURL, rawApiKey] = await Promise.all([
    settingsService.getString("AI_PROVIDER", "openai"),
    settingsService.getString("AI_BASE_URL", ""),
    settingsService.getString("AI_API_KEY", ""),
  ]);

  const provider = normalizeAiProvider(rawProvider);
  const baseURL = rawBaseURL.trim() || AI_PROVIDER_PRESETS[provider] || "";
  const isLocal = AI_LOCAL_PROVIDERS.includes(provider);
  const apiKey = rawApiKey.trim() || (isLocal ? "local" : "");

  if (!baseURL) {
    throw new AiChatError(
      "provider-misconfig",
      "AI_BASE_URL is required when using a custom provider",
    );
  }

  if (!isLocal && !rawApiKey.trim()) {
    throw new AiChatError("provider-misconfig", "AI_API_KEY must be configured in Settings");
  }

  return { provider, baseURL, apiKey };
}
