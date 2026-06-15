import type { SettingsService } from "@/application/services/settings.service";
import { AiChatError } from "@/domain/errors/ai-chat.error";
import { resolveAiConnection } from "./ai-connection.resolver";

export type FetchFn = typeof fetch;

interface ModelsApiResponse {
  data?: { id: string }[];
}

export async function listAiModels(
  settingsService: SettingsService,
  fetchFn: FetchFn = fetch,
): Promise<string[]> {
  const { baseURL, apiKey } = await resolveAiConnection(settingsService);

  const url = `${baseURL.replace(/\/$/, "")}/models`;

  let response: Response;
  try {
    response = await fetchFn(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });
  } catch (err) {
    throw new AiChatError("provider-unreachable", `Failed to reach ${url}: ${String(err)}`);
  }

  if (!response.ok) {
    throw new AiChatError("provider-unreachable", `Models endpoint returned ${response.status}`);
  }

  const body = (await response.json()) as ModelsApiResponse;

  if (!Array.isArray(body?.data)) {
    return [];
  }

  return [...new Set(body.data.map((m) => m.id).filter(Boolean))].sort();
}
