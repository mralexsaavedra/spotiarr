import { AI_LOCAL_PROVIDERS, AI_PROVIDER_PRESETS, normalizeAiProvider } from "@spotiarr/shared";
import type { AiProvider } from "@spotiarr/shared";
import type { SettingsService } from "@/application/services/settings.service";
import { MASKED_SENTINEL } from "@/application/use-cases/settings/get-settings.use-case";
import { AiChatError } from "@/domain/errors/ai-chat.error";

export interface AiConnection {
  provider: AiProvider;
  baseURL: string;
  apiKey: string;
}

export interface AiConnectionOverrides {
  provider?: string;
  baseURL?: string;
  apiKey?: string;
}

export async function resolveAiConnection(
  settingsService: SettingsService,
  overrides?: AiConnectionOverrides,
): Promise<AiConnection> {
  const [rawProvider, rawBaseURL, rawApiKey] = await Promise.all([
    settingsService.getString("AI_PROVIDER", "openai"),
    settingsService.getString("AI_BASE_URL", ""),
    settingsService.getString("AI_API_KEY", ""),
  ]);

  const providerSource =
    overrides?.provider && overrides.provider.trim() ? overrides.provider : rawProvider;
  const provider = normalizeAiProvider(providerSource);

  const baseURLSource = overrides?.baseURL?.trim() ?? rawBaseURL.trim();
  const baseURL = baseURLSource || AI_PROVIDER_PRESETS[provider] || "";

  const isLocal = AI_LOCAL_PROVIDERS.includes(provider);

  const overrideKey = overrides?.apiKey;
  const effectiveKey =
    overrideKey && overrideKey !== MASKED_SENTINEL ? overrideKey : rawApiKey.trim();
  const apiKey = isLocal ? "local" : effectiveKey;

  if (!baseURL) {
    throw new AiChatError(
      "provider-misconfig",
      "AI_BASE_URL is required when using a custom provider",
    );
  }

  if (!isLocal && !effectiveKey) {
    throw new AiChatError("provider-misconfig", "AI_API_KEY must be configured in Settings");
  }

  return { provider, baseURL, apiKey };
}
